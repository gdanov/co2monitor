Espruino firmware for monitoring co2 with MH-Z19 sensor

## How to develop

use [this tty REPL](https://github.com/gdanov/nodeserial) to push the code
`save()` and it's ready.

## wiring

remember to use 5v for the sensor. Add capacitor to the 3.3v rail to stabilize when plugged in usb port (at least for the heltec lora board)

## flashing
in the distro folder

```
/espruino_2v11_esp32>esptool.py --baud 2000000 --after hard_reset write_flash 0x1000 bootloader.bin 0x8000 partitions_espruino.bin 0x10000 espruino_esp32.bin
```
