/// <reference types="w3c-web-hid" />

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

const keys_0 = [
  { name: 'Menu', flag: 0x01 },
  { name: 'Fit', flag: 0x02 },
  { name: 'Top', flag: 0x04 },
//  { name: 'Unused', flag: 0x08 },
  { name: 'Rear', flag: 0x10 },
  { name: 'Front', flag: 0x20 },
]

const keys_1 = [
  { name: 'Clockwise', flag: 0x01 },
//  { name: 'Fit', flag: 0x02 },
//  { name: 'Top', flag: 0x04 },
//  { name: 'Unused', flag: 0x08 },
  { name: 'Button_1', flag: 0x10 },
  { name: 'Button_2', flag: 0x20 },
  { name: 'Button_3', flag: 0x40 },
  { name: 'Button_4', flag: 0x80 },
]

const keys_2 = [
//  { name: 'Clockwise', flag: 0x01 },
//  { name: 'Fit', flag: 0x02 },
//  { name: 'Top', flag: 0x04 },
//  { name: 'Unused', flag: 0x08 },
//  { name: 'Button_1', flag: 0x10 },
//  { name: 'Button_2', flag: 0x20 },
  { name: 'ESC', flag: 0x40 },
  { name: 'Alt', flag: 0x80 },
]

const keys_3 = [
    { name: 'Shift', flag: 0x01 },
    { name: 'Ctrl', flag: 0x02 },
    { name: 'Rotation', flag: 0x04 },
  //  { name: 'Unused', flag: 0x08 },
  //  { name: 'Button_1', flag: 0x10 },
  //  { name: 'Button_2', flag: 0x20 },
  //  { name: 'ESC', flag: 0x40 },
  //  { name: 'Alt', flag: 0x80 },
]

  // byte=2, bit=0),  # ROLL CLOCKWISE
  // byte=2, bit=4),  # 1
  // byte=2, bit=5),  # 2
  // byte=2, bit=6),  # 3
  // byte=2, bit=7),  # 4
  

  // byte=3, bit=7),  # ALT
  // byte=3, bit=6),  # ESC



  // byte=4, bit=2),  # ROTATION
  // byte=4, bit=1),  # CTRL
  // byte=4, bit=0),  # SHIFT


@Component({
    selector: 'app-root',
    imports: [CommonModule],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'viewer';


  async start() {
    const device = await navigator.hid.requestDevice({ filters: [] });

    console.log(device);
    device[0].addEventListener("inputreport", (ev) => {
      switch (ev.reportId) {
        case 1:
          const x = ev.data.getInt16(0);
          const y = ev.data.getInt16(2);
          const z = ev.data.getInt16(4);

          console.log(`Axis Event: x = ${x}, y = ${y}, z = ${z}`);



        break;

        case 3:
          const byte_0 = ev.data.getInt8(0);
          const byte_1 = ev.data.getInt8(1);
          const byte_2 = ev.data.getInt8(2);
          const byte_3 = ev.data.getInt8(3);
        
          keys_0.forEach(key => {
            if (key.flag & byte_0) {
              console.log(key.name);
            }
          })

          keys_1.forEach(key => {
            if (key.flag & byte_1) {
              console.log(key.name);
            }
          })

          keys_2.forEach(key => {
            if (key.flag & byte_2) {
              console.log(key.name);
            }
          })

          keys_3.forEach(key => {
            if (key.flag & byte_3) {
              console.log(key.name);
            }
          })

        break;


        case 23:
          console.log("Special event", ev);

        break;
        default:
          console.log("Unknown event", ev);


      }
    });

    await device[0].open();
  }
}
