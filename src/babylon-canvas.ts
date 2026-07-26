import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { Scene } from '@babylonjs/core/scene';
import type { SpaceMouseMotion } from './space-mouse';

interface NavigationModel {
  [key: string]: unknown;
  onConnect: () => void;
  on3dmouseCreated: () => void;
  onDisconnect: (reason: unknown) => void;
}

interface Controller {
  connect(): boolean;
  create3dmouse(canvas: HTMLCanvasElement, name: string): Promise<void>;
  update3dcontroller(data: Record<string, unknown>): Promise<void>;
  focus(): void;
  blur(): void;
  delete3dmouse(): void;
}

interface ControllerConstructor {
  new (navigationModel: NavigationModel): Controller;
}

export class BabylonCanvas {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly object;
  private readonly resizeObserver: ResizeObserver;
  private readonly camera: FreeCamera;
  private sdk?: Controller;
  private sdkConnected = false;
  private sdkMoving = false;
  private sdkLookOrigin = Vector3.Zero();
  private sdkLookDirection = new Vector3(0, 0, 1);
  private pointerX = 0;
  private pointerY = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.object = CreateBox('demo-object', { size: 2.5 }, this.scene);
    this.resizeObserver = new ResizeObserver(() => this.engine.resize());
    this.camera = new FreeCamera('camera', new Vector3(0, 1, -8), this.scene);
    this.scene.clearColor.set(0.025, 0.06, 0.12, 1);
    this.camera.setTarget(Vector3.Zero());
    this.camera.attachControl(this.canvas, true);
    this.canvas.tabIndex = 0;
    this.canvas.autofocus = true;
    this.canvas.addEventListener('pointermove', (event) => {
      const bounds = this.canvas.getBoundingClientRect();
      this.pointerX = event.clientX - bounds.left;
      this.pointerY = event.clientY - bounds.top;
    });
    new HemisphericLight('light', new Vector3(0, 1, -1), this.scene).intensity = 1.2;
    const material = new StandardMaterial('material', this.scene);
    material.diffuseColor = new Color3(0.18, 0.58, 0.95);
    material.specularColor = Color3.White();
    this.object.material = material;
    this.object.rotation = new Vector3(0.25, -0.45, 0);
    CreateGround('ground', { width: 12, height: 12 }, this.scene).position.y = -1.8;
    this.engine.runRenderLoop(() => {
      if (this.sdkMoving) {
        void this.sdk?.update3dcontroller({ frame: { time: performance.now() } }).catch((error) => {
          console.error('[3Dconnexion] frame update failed', error);
          this.sdkMoving = false;
        });
      }
      this.scene.render();
    });
    this.resizeObserver.observe(this.canvas);
  }

  rotate(motion: SpaceMouseMotion): void {
    const sensitivity = 0.00065;
    this.object.rotation.x += (motion.pitch + motion.y) * sensitivity;
    this.object.rotation.y += (motion.yaw + motion.x) * sensitivity;
    this.object.rotation.z += (motion.roll + motion.z) * sensitivity;
  }

  async connectSdk(): Promise<void> {
    if (this.sdkConnected) {
      this.canvas.focus();
      return;
    }

    const moduleUrl = new URL('vendor/3dconnexion/3dconnexion.module.min.js', document.baseURI).href;
    const tdx = await import(/* @vite-ignore */ moduleUrl) as { default: ControllerConstructor };
    if (!('ab' in window)) throw new Error('The 3Dconnexion WebSocket runtime did not load.');

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const fail = (message: string) => {
        if (!settled) { settled = true; reject(new Error(message)); }
      };
      const model: NavigationModel = {
        getCoordinateSystem: () => this.toSdkMatrix(Matrix.Identity()),
        getConstructionPlane: () => [0, 1, 0, 1.8],
        getFloorPlane: () => [0, 1, 0, 1.8],
        getUnitsToMeters: () => 1,
        // 3Dconnexion expects the diagonal FOV in radians; Babylon exposes vertical FOV.
        getFov: () => 2 * Math.atan(Math.tan(this.camera.fov / 2) * Math.sqrt(1 + this.engine.getAspectRatio(this.camera) ** 2)),
        getFrontView: () => this.toSdkMatrix(Matrix.Identity()),
        getLookAt: () => {
          const ray = new Ray(this.sdkLookOrigin, this.sdkLookDirection, this.camera.maxZ);
          const hit = this.scene.pickWithRay(ray, (mesh) => mesh === this.object);
          return hit?.pickedPoint?.asArray() ?? null;
        },
        getModelExtents: () => {
          const box = this.object.getBoundingInfo().boundingBox;
          return [...box.minimumWorld.asArray(), ...box.maximumWorld.asArray()];
        },
        getPerspective: () => true,
        getPivotPosition: () => this.object.getAbsolutePosition().asArray(),
        getPointerPosition: () => this.scene
          .createPickingRay(this.pointerX, this.pointerY, Matrix.Identity(), this.camera)
          .origin.asArray(),
        getViewRotatable: () => true,
        getViewExtents: () => [-1, -1, this.camera.minZ, 1, 1, this.camera.maxZ],
        getViewFrustum: () => {
          const bottom = -this.camera.minZ * Math.tan(this.camera.fov / 2);
          const left = bottom * this.engine.getAspectRatio(this.camera);
          return [left, -left, bottom, -bottom, this.camera.minZ, this.camera.maxZ];
        },
        getViewMatrix: () => this.toSdkMatrix(this.toSdkCoordinateSystem(this.camera.getWorldMatrix())),
        getViewTarget: () => this.camera.getTarget().asArray(),
        setViewMatrix: (data: number[]) => {
          this.setCameraMatrix(data);
        },
        setViewExtents: () => undefined,
        setFov: (fov: number) => {
          const aspect = this.engine.getAspectRatio(this.camera);
          this.camera.fov = 2 * Math.atan(Math.tan(fov / 2) / Math.sqrt(1 + aspect ** 2));
        },
        setActiveCommand: () => undefined,
        setTarget: (data: number[]) => this.camera.setTarget(Vector3.FromArray(data)),
        setLookFrom: (data: number[]) => { this.sdkLookOrigin = Vector3.FromArray(data); },
        setLookDirection: (data: number[]) => { this.sdkLookDirection = Vector3.FromArray(data); },
        setLookAperture: () => undefined,
        setSelectionOnly: () => undefined,
        setTransaction: () => undefined,
        onStartMotion: () => {
          this.sdkMoving = true;
        },
        onStopMotion: () => {
          this.sdkMoving = false;
        },
        onConnect: () => {
          try {
            this.sdk?.create3dmouse(this.canvas, 'WebThreeJS Sample');
          } catch (error) {
            console.error('[3Dconnexion] could not create controller', error);
            fail(`Could not create a SpaceMouse controller: ${String(error)}`);
          }
        },
        on3dmouseCreated: () => {
          this.sdkConnected = true;
          this.canvas.focus();
          void this.sdk?.update3dcontroller({ frame: { timingSource: 1 } }).catch((error) => {
            console.error('[3Dconnexion] could not configure controller timing', error);
          });
          const sdkApi = tdx.default as ControllerConstructor & {
            ActionTree: new () => { push(node: unknown): unknown };
            ActionSet: new (id: string, label: string) => unknown;
          };
          const actionTree = new sdkApi.ActionTree();
          actionTree.push(new sdkApi.ActionSet('Default', 'SpaceMouse demo'));
          void this.sdk?.update3dcontroller({ commands: { activeSet: 'Default', tree: actionTree } }).catch((error) => {
            console.error('[3Dconnexion] could not register application actions', error);
          });
          if (!settled) { settled = true; resolve(); }
        },
        onDisconnect: (reason: unknown) => {
          console.warn('[3Dconnexion] Navigation Library disconnected', reason);
          this.sdkConnected = false;
          this.sdkMoving = false;
          fail(`Navigation Library disconnected (${String(reason)}).`);
        }
      };
      this.sdk = new tdx.default(model);
      if (!this.sdk.connect()) fail('The local Navigation Library Server is unavailable.');
      window.setTimeout(() => fail('Timed out waiting for the Navigation Library Server.'), 6000);
    });
  }

  disconnectSdk(): void {
    this.sdk?.delete3dmouse();
    this.sdk = undefined;
    this.sdkConnected = false;
    this.sdkMoving = false;
  }

  private setCameraMatrix(data: number[]): void {
    const scale = Vector3.One();
    const rotation = Quaternion.Identity();
    const position = Vector3.Zero();
    this.toBabylonCoordinateSystem(Matrix.FromArray(data)).decompose(scale, rotation, position);
    this.camera.position.copyFrom(position);
    this.camera.rotationQuaternion = rotation;
    this.camera.computeWorldMatrix();
  }

  private toSdkMatrix(matrix: Matrix): number[] {
    // Babylon stores matrix values in a Float32Array. Autobahn serializes typed
    // arrays as objects, while the Navigation Library requires a JSON array.
    return Array.from(matrix.toArray());
  }

  private toBabylonCoordinateSystem(matrix: Matrix): Matrix {
    return this.zAxisMirror().multiply(matrix).multiply(this.zAxisMirror());
  }

  private toSdkCoordinateSystem(matrix: Matrix): Matrix {
    return this.zAxisMirror().multiply(matrix).multiply(this.zAxisMirror());
  }

  private zAxisMirror(): Matrix {
    return Matrix.Scaling(1, 1, -1);
  }

  dispose(): void {
    this.disconnectSdk();
    this.resizeObserver.disconnect();
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }
}
