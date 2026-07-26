export interface SpaceMouseMotion {
  x: number;
  y: number;
  z: number;
  pitch: number;
  roll: number;
  yaw: number;
}

/** Direct WebHID reader for a 3Dconnexion SpaceMouse report layout. */
export class RawSpaceMouse {
  private device?: HIDDevice;
  private listener?: (event: HIDInputReportEvent) => void;

  async connect(onMotion: (motion: SpaceMouseMotion) => void): Promise<void> {
    this.disconnect();
    const [device] = await navigator.hid.requestDevice({ filters: [{ vendorId: 0x256f }] });
    if (!device) throw new Error('No device was selected.');

    this.device = device;
    this.listener = (event) => {
      if (event.reportId === 1 && event.data.byteLength >= 6) {
        onMotion({
          x: event.data.getInt16(0, true), y: event.data.getInt16(2, true), z: event.data.getInt16(4, true),
          pitch: 0, roll: 0, yaw: 0
        });
      }
      if (event.reportId === 2 && event.data.byteLength >= 6) {
        onMotion({
          x: 0, y: 0, z: 0,
          pitch: event.data.getInt16(0, true), roll: event.data.getInt16(2, true), yaw: event.data.getInt16(4, true)
        });
      }
    };
    device.addEventListener('inputreport', this.listener);
    await device.open();
  }

  disconnect(): void {
    if (!this.device) return;
    if (this.listener) this.device.removeEventListener('inputreport', this.listener);
    void this.device.close();
    this.device = undefined;
    this.listener = undefined;
  }
}
