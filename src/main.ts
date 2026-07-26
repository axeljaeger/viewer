import './style.css';
import { BabylonCanvas } from './babylon-canvas';
import { RawSpaceMouse } from './space-mouse';

const canvas = document.querySelector<HTMLCanvasElement>('#viewer');
const rawButton = document.querySelector<HTMLButtonElement>('#connect-raw');
const sdkButton = document.querySelector<HTMLButtonElement>('#connect-sdk');
const status = document.querySelector<HTMLElement>('#status');

if (!canvas || !rawButton || !sdkButton || !status) {
  throw new Error('The demo page is missing required controls.');
}

const viewer = new BabylonCanvas(canvas);
const raw = new RawSpaceMouse();
const rawButtonElement = rawButton;
const sdkButtonElement = sdkButton;
const statusElement = status;
let connection: 'raw' | 'sdk' | undefined;

function setStatus(message: string): void {
  statusElement.textContent = message;
}

function renderConnection(): void {
  rawButtonElement.hidden = connection === 'sdk';
  sdkButtonElement.hidden = connection === 'raw';
  rawButtonElement.textContent = connection === 'raw' ? 'Disconnect from WebHID' : 'Connect using WebHID';
  sdkButtonElement.textContent = connection === 'sdk' ? 'Disconnect from SDK' : 'Connect using SDK';
}

rawButtonElement.addEventListener('click', async () => {
  if (connection === 'raw') {
    raw.disconnect();
    connection = undefined;
    renderConnection();
    setStatus('Disconnected from WebHID.');
    return;
  }

  try {
    setStatus('Choose your SpaceMouse in the browser dialog…');
    await raw.connect((motion) => viewer.rotate(motion));
    connection = 'raw';
    renderConnection();
    setStatus('Connected through raw WebHID.');
  } catch (error) {
    setStatus(`Raw WebHID could not connect: ${String(error)}`);
  }
});

sdkButtonElement.addEventListener('click', async () => {
  if (connection === 'sdk') {
    viewer.disconnectSdk();
    connection = undefined;
    renderConnection();
    setStatus('Disconnected from the 3Dconnexion SDK.');
    return;
  }

  try {
    setStatus('Connecting to the local 3Dconnexion Navigation Library…');
    await viewer.connectSdk();
    connection = 'sdk';
    renderConnection();
    setStatus('Connected through the 3Dconnexion SDK. Focus the canvas to navigate.');
  } catch (error) {
    setStatus(`3Dconnexion SDK could not connect: ${String(error)}`);
  }
});

window.addEventListener('beforeunload', () => {
  raw.disconnect();
  viewer.dispose();
});

renderConnection();
