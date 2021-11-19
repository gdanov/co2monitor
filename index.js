let dgram = require('dgram');

const myserial = getSerial ();

function dumpInHex (arr){
	return arr.split ('')
		.map (i => i.charCodeAt (0).toString (16))
		.join (" ")
}

function MHgetCheckSum(packet) { 
	let i, checksum=0; 
	for( i = 1; i < 8; i++) 
	{ 
		checksum += packet[i]; 
	}
	checksum = 0xff - checksum; 
	checksum += 1; 
  return checksum; 
} 

function MHCommand (bytes){
	let ret= [0xff].concat (bytes.slice (0,7))
	return ret.concat ([ MHgetCheckSum (ret) ])
}

const mh_get_ppm = MHCommand ([0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00])
const mh_get_raw = MHCommand ([0x01, 0x84, 0x00, 0x00, 0x00, 0x00, 0x00])
const mh_no_abc = MHCommand ([0x01, 0x79, 0x00, 0x00, 0x00, 0x00, 0x00])

//console.log (":::", mh_get_ppm,mh_no_abc)

var display;

function onInit() {
	Serial2.setup(9600, { tx: D12, rx: D13 });
	// disable ABC
	Serial2.write (mh_no_abc)
	
	Serial2.on("data", function (data) {
		console.log(
			"Serial2: ", dumpInHex (data),
			"ppm:",
			data.charCodeAt(2) * 256 + data.charCodeAt(3)
		);

		if (data.charCodeAt (1) == 0x86){
			let ppm = data.charCodeAt(2) * 256 + data.charCodeAt(3);
			g.clear (false);
			g.drawString(ppm + "", 2, 15, true);
			g.flip();

			// without NTP this is way off
			//let ts = Date.now() * 1000000;
			let socket = dgram.createSocket('udp4');
			socket.send (`co2,agent=${myserial},sensorid=1 ppm=${ppm}`, 8089, "srvy.lan")
			socket.close ();
		}
	});

	console.log("serial set-up");

	I2C1.setup({ scl: D15, sda: D4 });

	function start() {
		console.log(g.getFonts());
		//g.setFont("6x8", 5);
		g.setFont ("Vector", 48)

		g.flip();
	}

	var g = require("SSD1306").connect(I2C1, start);
	g.setContrast (0)
	display=g

	// ----------
	//require("Wifi").setSNTP("server", tz_offset)
}

function go() {
  Serial2.write(mh_get_ppm);
}

setInterval(go, 5000);

setInterval (()=>{
//		Serial2.write(mh_get_raw);
}, 3000)
