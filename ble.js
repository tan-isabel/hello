// Original Experiment 1E p5ble connection and UUIDs.
const serviceUuid = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const txCharacteristic = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const rxCharacteristic = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
let myCharacteristicRx, myCharacteristicTx, myBLE, connectButton;
let bleConnected = false;
let queuedAngles = null, sending = false;
function bleSetup() {
  myBLE = new p5ble();
  connectButton = createButton("Connect BLE");
  connectButton.id("connectBLE");
  connectButton.mousePressed(connectAndStartNotify);
}
function connectAndStartNotify() {
  myBLE.connect(serviceUuid, gotCharacteristics);
}
function gotCharacteristics(error, characteristics) {
  if (error) { console.error("BLE CONNECTION ERROR:", error); return; }
  for (let i = 0; i < characteristics.length; i++) {
    const id = characteristics[i].uuid.toLowerCase();
    if (id === rxCharacteristic) {
      myCharacteristicRx = characteristics[i];
      myBLE.startNotifications(myCharacteristicRx, handleNotifications, "string");
    } else if (id === txCharacteristic) {
      myCharacteristicTx = characteristics[i];
    }
  }
  bleConnected = !!myCharacteristicTx;
  if (bleConnected) {
    connectButton.html("BLE Connected");
    connectButton.addClass("connected");
  }
}
function handleNotifications(data) { console.log("ESP32:", data); }
function sendAngles(angles) {
  if (!bleConnected || !myCharacteristicTx) return;
  queuedAngles = angles.map(a => Math.max(5, Math.min(180, Math.round(a))));
  flushAngles();
}
async function flushAngles() {
  if (sending || !queuedAngles || !bleConnected) return;
  sending = true;
  try {
    while (queuedAngles && bleConnected) {
      const values = queuedAngles;
      queuedAngles = null;
      for (let start = 0; start < 16; start += 4) {
        // <= 19 ASCII bytes per write, safe for standard BLE payload.
        const message = "C," + start + "," + values.slice(start, start + 4).join(",");
        await Promise.resolve(myBLE.write(myCharacteristicTx, message));
      }
    }
  } catch(e) { console.error("BLE WRITE ERROR:", e); }
  sending = false;
}
function sendResetCommand() { sendAngles(Array(16).fill(90)); }
