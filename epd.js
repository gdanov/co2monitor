// see //#define GxEPD2_DRIVER_CLASS GxEPD2_290_C90c // GDEM029C90  128x296, SSD1680
// https://v4.cecdn.yun300.cn/100001_1909185148/GDEM029C90.pdf page 30
// https://github.com/ZinggJM/GxEPD2/blob/master/src/epd3c/GxEPD2_290_C90c.h

/**
 * Represents an SSD1606 Display Driver with Controller.
 * Right now it works out of the box with the GDE021A1 e-paper display.
 */
/**
 * GDE021A1 display data.
 * This display data is based on specification version 'A/0(For SLC 505a FH E21002-DL Ver02 TFT' from 22.10.2012.
 * RAM x address end at 11h(17)->72, because otherwise it would default to 1Fh(31)->128,
 * which is too large for this display.
 * RAM y address end at ABh(171)->172, because otherwise it default to B3h(179)->180
 * which is too large for this display.
 * LUT Register data is the needed waveform for this display.
 * Max screenbytes are 172*72 / 4 = 3096 bytes (4 Pixels per byte).
 */
var C = {
  GDE021A1: {
    bpp: 2,
    displaySizeX: 72,
    displaySizeY: 172,
    /*    lutRegisterData: new Uint8Array([
      0x00, 0x00, 0x00, 0x55, 0x00, 0x00, 0x55, 0x55, 0x00, 0x55, 0x55, 0x55, 0xaa, 0xaa, 0xaa, 0xaa, 0x15, 0x15, 0x15,
      0x15, 0x05, 0x05, 0x05, 0x05, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x22, 0xfb, 0x22, 0x1b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]), */
    maxScreenBytes: 3096,
    ramXStartAddress: 0x00,
    ramXEndAddress: 0x11,
    ramYStartAddress: 0x00,
    ramYEndAddress: 0xab
  }
};
/**
 * Represents an SSD1606 Display Driver with Controller.
 * All functions are based on spefication version 1.1 from 10/2011.
 * Informations:
 * <ul>
 * <li>The display controller provides up to 180/128/4=5580 bytes of display buffer RAM.</li>
 * <li>Works only with SPI 4-wire mode with using a D/C (data/command) pin.</li>
 * <li>If you provide the BS1 pin the module will handle the correct SPI mode setting.</li>
 * <li>For some future-proof you can set up the clearScreenTimeOut and hardwareResetTimeOut.</li>
 * </ul>
 * @constructor
 * @param config - configuration with displayType, SPI and additional pins.
 */
function SSD1680(config) {
  if (config.displayType === 'GDE021A1') {
    this.display = C.GDE021A1;
  } else {
    if (config.display) {
      this.display = config.display;
    } else {
      return new Error('Unknown display type "' + config.displayType + '"" and no display configuration provided!');
    }
  }
  this.spi = config.spi;
  // 3/4 wire mode, NOT USED
  this.bs1Pin = config.bs1Pin;
  // chip select
  this.cs1Pin = config.cs1Pin;
  // data/command pin
  this.dcPin = config.dcPin;
  this.busyPin = config.busyPin;
  this.resetPin = config.resetPin;
  this.powerPin = config.powerPin;
  this.g = this.grfx();
  if (config.clearScreenTimeOut) {
    this.csbTimeOut = config.clearScreenTimeOut;
  } else {
    this.csbTimeOut = 100;
  }
  if (config.clearScreenTimeOut) {
    this.hwResetTimeOut = config.hardwareResetTimeOut;
  } else {
    this.hwResetTimeOut = 100;
  }

  this.testBuff = new Uint8ClampedArray((this.display.displaySizeX * this.display.displaySizeY) / 8) //
    .fill(0xcc);
  //.map((_v, i) => i % 2);
  this.testBuff2 = this.testBuff.map((v) => ~v);

  console.log('config:', this);
}

/**
 * Power on the display, using the provided powerPin.
 */
SSD1680.prototype.on = function () {
  if (this.powerPin) {
    digitalWrite(this.powerPin, 1);
  }
};
/**
 * Power off the display, using the provided powerPin.
 */
SSD1680.prototype.off = function () {
  if (this.powerPin) {
    digitalWrite(this.powerPin, 1);
  }
};
/**
 * Use resetPin to make a hardware reset.
 * @param {Function} callback - callback function
 */
SSD1680.prototype.hwReset = function (callback) {
  // see https://github.com/wemos/LOLIN_EPD_Library/blob/100a6c8bd1dedd6768aa06faa5ae6e5fbc3ca67e/src/LOLIN_EPD.cpp#L75
  digitalWrite(this.cs1Pin, 1);
  /*
		digitalWrite(rst, HIGH);
    delay(1);
    // bring reset low
    digitalWrite(rst, LOW);
    // wait 10ms
    delay(10);
    // bring out of reset
    digitalWrite(rst, HIGH);
	 */
  digitalPulse(this.resetPin, 1, [1, 10]);
  digitalWrite(this.resetPin, 1);

  console.log('--reset', digitalRead(this.busyPin));
};

/**
	 busy wait for the busy pin
 */
SSD1680.prototype.busyWait = function () {
  let i = 0;
  let start = getTime();
  let cancelled = false;
  console.log('--busy wait', start);
  //  this.checkBusy(() => console.log('--unbusy', start, Math.round((getTime() - start) * 1000), 'ms'));
  while (digitalRead(this.busyPin)) {
    i++;
    if (i > 9000) {
      cancelled = true;
      break;
    }
  }
  if (cancelled) {
    console.log('--cancelled busy wait!', start, 'Elapsed:', Math.round((getTime() - start) * 1000), 'ms');
  } else {
    console.log('--busy wait over', start, 'Elapsed:', Math.round((getTime() - start) * 1000), 'ms');
  }
};

/**
 * Initialize display.
 */
SSD1680.prototype.init = function (callback, options) {
  // see https://github.com/wemos/LOLIN_EPD_Library/blob/100a6c8bd1dedd6768aa06faa5ae6e5fbc3ca67e/src/LOLIN_SSD1680.cpp#L66

  console.log('--init');

  this.hwReset();
  this.busyWait();

  this.sc(0x12); // SWRESET
  this.busyWait();

  // driver output control
  this.scd(0x01, [0xf9, 0x00, 0x00]); //Driver output control

  // data entry mode
  this.scd(0x11, 0x01);

  //set Ram-X address start/end position
  this.scd(0x44, [0x00, 0x0e]); //0x0F-->(15+1)*8=128
  //set Ram-Y address start/end position
  this.scd(0x45, [0xf9, 0x00, 0x00, 0x00]); //0xF9-->(249+1)=250
  //BorderWavefrom
  this.scd(0x3c, 0x05);
  // Select built-in temperature sensor
  this.scd(0x18, 0x80);
  //let temp = this.scd(0x1a);
  //console.log('== TEMP', temp);
  //  Display update control
  this.scd(0x21, [0x00, 0x00]);
  // set RAM x address count to 0;
  this.scd(0x4e, 0x00);
  // set RAM y address count to 0X199;
  this.scd(0x4f, [0xf9, 0x00]);

  this.busyWait();

  console.log('--init over');
  /*
  if (options && options.clearScreenColor) {
    return this.csb(callback, options.clearScreenColor);
  } else {
    return callback();
  }*/
};
/**
 * Send a command to the display, uses the cs1Pin (chip select).
 * Uses the dcPin if spimode is set to 4-lines, otherwise add a bit to the
 * left to signal a command.
 * Possible commands:
 * <ol>
 * <li>0x01 - Driver output control</li>
 * </ol>
 * @param {number} command - a command
 */
SSD1680.prototype.sc = function (command) {
  /*
		void LOLIN_EPD::sendCmd(uint8_t c)
		{
		// SPI
		csHigh();
		dcLow();
		csLow();

		uint8_t data = fastSPIwrite(c);

		csHigh();
		}
	 */
  digitalWrite(this.cs1Pin, 1);
  digitalWrite(this.dcPin, 0);
  // last arg is NSS pin, low -> write -> high
  // https://www.espruino.com/Reference#t_l_SPI_send
  return this.spi.send(command, this.cs1Pin);
};

/**
 * Send data to the controller.
 * @param data - the data
 */
SSD1680.prototype.sd = function (data) {
  /*
		void LOLIN_EPD::sendData(uint8_t data)
		{
		// SPI
		csHigh();
		dcHigh();
		csLow();

		fastSPIwrite(data);

		csHigh();
		}
	*/
  digitalWrite(this.cs1Pin, 1);
  digitalWrite(this.dcPin, 1);
  return this.spi.send(data, this.cs1Pin);
};
/**
 * Send command and data to the controller.
 * @param command - the command
 * @param data - the data
 */
SSD1680.prototype.scd = function (command, data) {
  this.sc(command);
  return this.sd(data);
};
/**
 * Checks the busyPin and runs the callback, wenn the busyPin is LOW.
 * @param {Function} callback - the callback function
 */
SSD1680.prototype.checkBusy = function (callback) {
  return setWatch(callback, this.busyPin, { repeat: false, edge: 'falling' });
};
/**
 * Clears the display screenbuffer with desired color.
 * Possible color values:
 * <ul>
 * <li>0b00000000 = all black, or decimal 0, or hexadecimal 0x00</li>
 * <li>0b01010101 = dark gray, or decimal 85, or hexadecimal 0x55</li>
 * <li>0b10101010 = light gray, or decimal 170, or hexadecimal 0xAA</li>
 * <li>0b11111111 = light gray, or decimal 255, or hexadecimal 0xFF</li>
 * </ul>
 * Right now it sends each 4-pixel byte individually, but does not need an
 * internal buffer array.
 * The display driver handles the X and Y RAM counters itself, so it is save to
 * just write the bytes.
 * To leave the write RAM mode a 'NOP' command is sent.
 * According to specification a check of the BusyPin is needed, but this does not work here.
 * It seems the display driver encapsulates this behaviour.
 * @param {Function} callback - the callback function, will be called, when finished
 * @param {number} clearScreenColor - the color to set
 */
SSD1680.prototype.csb = function (callback, clearScreenColor) {
  this.scd(0x44, 0x00);
  this.scd(0x45, 0x00);
  this.sc(0x24);
  // TODO one command?
  for (var i = 0; i < this.display.maxScreenBytes; i++) {
    this.sd(clearScreenColor);
  }
  this.sc(0xff);
  return setTimeout(callback, this.csbTimeOut);
};
/**
 * Refresh the screen, need to be called by application every time the screen changed.
 * Refresh sequence:
 * <ol>
 * <li>Master activation</li>
 * <li>Display update 2 - part of <em>closebump</em> in specification</li>
 * <li>Master activation  - part of <em>closebump</em> in specification</li>
 * <li>check BusyPin before the display can receive further commands or data. Part of <em>closebump</em> in specification</li>
 * </ol>
 * @param {Function} callback - callback is called, when busy pin is ready.
 */

SSD1680.prototype.update = function () {
  // see https://github.com/wemos/LOLIN_EPD_Library/blob/100a6c8bd1dedd6768aa06faa5ae6e5fbc3ca67e/src/LOLIN_SSD1680.cpp#L138
  console.log('--update');

  this.scd(0x22, 0xf7); //Display Update Control
  this.sc(0x20); //Activate Display Update Sequence
  this.busyWait();

  console.log('--update over');
};
/**
 * writes out the buffers
 *
 * Sets the X and Y RAM counter.
 * @param {number} xCount - X RAM counter
 * @param {number} yCount - Y RAM counter
 */
SSD1680.prototype.doDisplay = function (xCount, yCount) {
  // see https://github.com/wemos/LOLIN_EPD_Library/blob/100a6c8bd1dedd6768aa06faa5ae6e5fbc3ca67e/src/LOLIN_SSD1680.cpp#L119

  //this.scd(0x24, this.bw_buff);
  console.log('--display');

  this.scd(0x24, this.testBuff);

  this.scd(0x26, this.testBuff2);

  this.update();

  console.log('--display over');
  //

  //  this.scd(0x4e, xCount);
  //this.scd(0x4f, yCount);
};
/**
 * Creates the Graphics object with Graphics.createArrayBuffer(...).
 * Sets the display x size, y size, bits per pixel and msb:true.
 * Provides a clear function to fill in-memory buffer with one color for each pixel.
 * Provides a flip function to flush in-memory buffer to display buffer.
 */
SSD1680.prototype.grfx = function () {
  var _display = this;
  var g = Graphics.createArrayBuffer(this.display.displaySizeX, this.display.displaySizeY, this.display.bpp, {
    msb: true
  });

  g.clear = function (clearColor) {
    new Uint8Array(this.buffer).fill(clearColor);
    //display
    //delay(100)
    //display()
  };

  g.flip = function () {
    _display.doDisplay(0, 0);
    _display.scd(0x24, this.buffer);
    _display.sc(0xff);
  };
  return g;
};
/**
 * Export the module.
 */
connect = function (options) {
  return new SSD1680(options);
};

console.log('ready');

SPI2.setup({ sck: D18, mosi: D23 });

let g = new SSD1680({
  display: {
    bpp: 2,
    displaySizeX: 122,
    displaySizeY: 250,
    maxScreenBytes: 3096,
    ramXStartAddress: 0x00,
    ramXEndAddress: 0x11,
    ramYStartAddress: 0x00,
    ramYEndAddress: 0xab
  },
  spi: SPI2,
  cs1Pin: D4,
  dcPin: D0,
  busyPin: D15,
  resetPin: D2,
  powerPin: null
});

console.log('set-up');

g.init();
console.log('######################################');
g.doDisplay();

//g.doDisplay();

console.log('done');