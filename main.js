'use strict';

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// additional required packages
const axios = require('axios');

class Iolink extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'iolink',
		});
		this.on('ready', this.onReady.bind(this));
		//this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		this.log.info('IO-Link adapter - started');

		const endpoint = this.config.ifmSmA1x5xIp;
		const iolinkport = this.config.ifmSmIoLinkPort;

		this.log.debug('IO-Link adapter - fetching data started');
		if (endpoint && iolinkport) {
			await getData(endpoint, iolinkport, this);
		} else {
			this.log.error('IO-Link adapter - config incomplete!');
			this.stop();
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
			callback();
		}
	}

}

const getData = async (endpoint, iolinkport, adapter) => {
	try {
		//sensor info and process data requests
		let requestSensorData = getRequestBody(`/iolinkmaster/port[${iolinkport}]/iolinkdevice/pdin/getdata`);
		let requestSensorName = getRequestBody(`/iolinkmaster/port[${iolinkport}]/iolinkdevice/productname/getdata`);
		let requestSensorComSpeed = getRequestBody(`/iolinkmaster/port[${iolinkport}]/comspeed/getdata`);
		let requestSensorCycletime = getRequestBody(`/iolinkmaster/port[${iolinkport}]/mastercycletime_actual/getdata`);
		let requestSensorVendorId = getRequestBody(`/iolinkmaster/port[${iolinkport}]/iolinkdevice/vendorid/getdata`);
		let requestSensorId = getRequestBody(`/iolinkmaster/port[${iolinkport}]/iolinkdevice/deviceid/getdata`);
		let requestDeviceSn = getRequestBody(`/iolinkmaster/port[${iolinkport}]/iolinkdevice/serial/getdata`);
		let requestSensorStatus = getRequestBody(`/iolinkmaster/port[${iolinkport}]/iolinkdevice/status/getdata`);

		//master info and process data requests
		let requestMasterCurrent = getRequestBody(`/processdatamaster/current/getdata`);
		let requestMasterCurrentUnit = getRequestBody(`/processdatamaster/current/unit/getdata`);
		let requestMasterVoltage = getRequestBody(`/processdatamaster/voltage/getdata`);
		let requestMasterVoltageUnit = getRequestBody(`/processdatamaster/voltage/unit/getdata`);
		let requestMasterTemperature = getRequestBody(`/processdatamaster/temperature/getdata`);
		let requestMasterTemperatureUnit = getRequestBody(`/processdatamaster/temperature/unit/getdata`);
		let requestMasterStatus = getRequestBody(`/processdatamaster/supervisionstatus/getdata`);
		let requestMasterName = getRequestBody(`/deviceinfo/productcode/getdata`);
		let requestMasterSerial = getRequestBody(`/deviceinfo/serialnumber/getdata`);
		let requestMasterSoftwareRevision = getRequestBody(`/deviceinfo/swrevision/getdata`);
		let requestMasterBootloaderRevision = getRequestBody(`/deviceinfo/bootloaderrevision/getdata`);
		let requestMasterHardwareRevision = getRequestBody(`/deviceinfo/hwrevision/getdata`);
		let requestMasterMac = getRequestBody(`/iotsetup/network/macaddress/getdata`);


		let masterDeviceName = await getValue(endpoint, requestMasterName);

		let availablPorts = 0;
		switch (masterDeviceName) {
			case 'AL1350':
				availablPorts = 4;
				break;
			case 'AL1352':
				availablPorts = 8;
				break;
			default:
				adapter.log.error(`IO-Link adapter - Master ${masterDeviceName} is not supported!`);
				adapter.stop();
				break;
		}

		let sensorName = await getValue(endpoint, requestSensorName);
		//TODO: check sensor name

		adapter.setObjectNotExists(masterDeviceName, {
			type: 'device',
			common: {
				name: `IFM ${masterDeviceName}`,
				read: true,
				write: false
			}
		});

		var idMasterProcessData = `${masterDeviceName}.processdata`;
		var idMasterInfo = `${masterDeviceName}.info`;

		adapter.setObjectNotExists(idMasterProcessData, {
			type: 'channel',
			common: {
				name: `Process data (Master)`,
				read: true,
				write: false
			}
		});


		adapter.setObjectNotExists(idMasterInfo, {
			type: 'channel',
			common: {
				name: `Info`,
				read: true,
				write: false
			}
		});

		adapter.setObjectNotExists(`${masterDeviceName}.${iolinkport}`, {
			type: 'channel',
			common: {
				name: `IO-Link port ${iolinkport}`,
				read: true,
				write: false
			}
		});

		var idSensor = `${masterDeviceName}.${iolinkport}.${sensorName}`;

		const json = require('./devices/device-spec.json'); //(with path)
		var dummySpec = DeviceSpec.from(json);

		generateChannelObject(`${masterDeviceName}.iolinkports`, 'IO-Link Ports')
		await getPortData(endpoint, 1, `${masterDeviceName}.iolinkports`, null);
		await getPortData(endpoint, 2, `${masterDeviceName}.iolinkports`, dummySpec);
		//await getPortData(endpoint, 3, `${masterDeviceName}.iolinkports`);


		adapter.setObjectNotExists(idSensor, {
			type: 'device',
			common: {
				name: `IFM ${sensorName}`,
				read: true,
				write: false
			}
		});

		var idProcessData = `${idSensor}.processdata`;
		var idIoLink = `${idSensor}.iolink`;

		adapter.setObjectNotExists(idProcessData, {
			type: 'channel',
			common: {
				name: `Process data`,
				read: true,
				write: false
			}
		});

		adapter.setObjectNotExists(idIoLink, {
			type: 'channel',
			common: {
				name: `IO-Link`,
				read: true,
				write: false
			}
		});

		let tmpVorlauf = 0;
		let tmpRuecklauf = 0;
		let tmpDelta = 0;

		const sensorPortMap = new Map();
		for (let i = 1; i <= 4; i++) {
			let sensorPort = i;
			let requestSensorId = getRequestBody(`/iolinkmaster/port[${sensorPort}]/iolinkdevice/deviceid/getdata`);
			sensorPortMap.set(sensorPort, await getValue(endpoint, requestSensorId));
		}

		for (let [sensorPort, sensorId] of sensorPortMap) {
			let bytes = await getValue(endpoint, getRequestBody(`/iolinkmaster/port[${sensorPort}]/iolinkdevice/pdin/getdata`));
			let sensorid = await getValue(endpoint, requestSensorId);

			if (sensorId === 135) {//let out1Value = (bytes[7] & 0x01) === 0x01;
				//let out2Value = (bytes[7] & 0x02) === 0x02;

				//0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
				//0 1 A 1 F F 0 0 0 0 C  F  F  F  0  0
				let humiditySub = bytes.substring(0, 4);
				let humidity = parseInt(humiditySub, 16);
				humidity = humidity * 0.1;

				let tempSub = bytes.substring(8, 12);
				let temp = parseInt(tempSub, 16);
				temp = temp * 0.1;

				adapter.setObjectNotExists(`${idProcessData}.humidity135`, {
					type: 'state',
					common: {
						name: 'Humidity135',
						role: 'value.humidity135',
						type: 'number',
						value: humidity,
						unit: '%',
						read: true,
						write: false
					}
				});
				adapter.setState(`${idProcessData}.humidity135`, humidity, true);

				adapter.setObjectNotExists(`${idProcessData}.temperature135`, {
					type: 'state',
					common: {
						name: 'Temperature135',
						role: 'value.temperature135',
						type: 'number',
						value: temp,
						unit: '°C',
						read: true,
						write: false
					}
				});
				adapter.setState(`${idProcessData}.temperature135`, temp, true);
			}
			//Port 2
			else if (sensorId === 6) {
				let tempretureVorlauf = parseInt(bytes, 16);
				tempretureVorlauf = tempretureVorlauf * 0.1;
				tmpVorlauf = tempretureVorlauf;
				adapter.setObjectNotExists(`${idProcessData}.TemperatureVorlauf`, {
					type: 'state',
					common: {
						name: 'TemperatureVorlauf',
						role: 'value.TemperatureVorlauf',
						type: 'number',
						value: tempretureVorlauf,
						unit: '°C',
						read: true,
						write: false
					}
				});
				adapter.setState(`${idProcessData}.TemperatureVorlauf`, tempretureVorlauf, true);
			}
			//Port 3
			else if (sensorId === 25) {

			}
			//Port 4
			else if (sensorId === 48) {

				let flow = parseInt(bytes.substring(0, 4), 16);

				let wordTwo = parseInt(bytes.substring(4, 8), 16);
				let temperatureRuecklauf = wordTwo >> 2;
				temperatureRuecklauf = temperatureRuecklauf * 0.1;
				tmpRuecklauf = temperatureRuecklauf;

				adapter.setObjectNotExists(`${idProcessData}.flow48`, {
					type: 'state',
					common: {
						name: 'Flow48',
						role: 'value.flow48',
						type: 'number',
						value: flow,
						unit: '%',
						read: true,
						write: false
					}
				});
				adapter.setState(`${idProcessData}.flow48`, flow, true);

				adapter.setObjectNotExists(`${idProcessData}.temperatureRuecklauf`, {
					type: 'state',
					common: {
						name: 'TemperatureRuecklauf',
						role: 'value.temperatureRuecklauf',
						type: 'number',
						value: temperatureRuecklauf,
						unit: '°C',
						read: true,
						write: false
					}
				});
				adapter.setState(`${idProcessData}.temperatureRuecklauf`, temperatureRuecklauf, true);
			}
		}

		tmpDelta = tmpRuecklauf - tmpVorlauf;

		adapter.setObjectNotExists(`${idProcessData}.temperatureDelta`, {
			type: 'state',
			common: {
				name: 'TemperatureDelta',
				role: 'value.temperatureDelta',
				type: 'number',
				value: tmpDelta,
				unit: '°C',
				read: true,
				write: false
			}
		});
		adapter.setState(`${idProcessData}.temperatureDelta`, tmpDelta, true);

		//#################################################################################
		//IO-Link infos

		let comSpeed = '';
		switch (await getValue(endpoint, requestSensorComSpeed)) {
			case 0:
				comSpeed = 'COM1 (4.8 kBaud)';
				break;
			case 1:
				comSpeed = 'COM2 (38.4 kBaud)';
				break;
			case 2:
				comSpeed = 'COM3 (230.4 kBaud)';
				break;
		}

		adapter.setObjectNotExists(`${idIoLink}.comspeed`, {
			type: 'state',
			common: {
				name: 'Communication Mode',
				role: 'value',
				type: 'string',
				value: comSpeed,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idIoLink}.comspeed`, comSpeed, true);


		let deviceStatus = '';
		switch (await getValue(endpoint, requestSensorStatus)) {
			case 0:
				deviceStatus = 'Not connected';
				break;
			case 1:
				deviceStatus = 'Preoperate';
				break;
			case 2:
				deviceStatus = 'Operate';
				break;
			case 3:
				deviceStatus = 'Communication error';
				break;
		}

		adapter.setObjectNotExists(`${idIoLink}.status`, {
			type: 'state',
			common: {
				name: 'Device status',
				role: 'info.status',
				type: 'string',
				value: deviceStatus,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idIoLink}.status`, deviceStatus, true);


		let cycletime = await getValue(endpoint, requestSensorCycletime) / 1000;

		adapter.setObjectNotExists(`${idIoLink}.mastercycletime`, {
			type: 'state',
			common: {
				name: 'Master Cycletime',
				role: 'value.interval',
				type: 'number',
				unit: 'ms',
				value: cycletime,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idIoLink}.mastercycletime`, cycletime, true);


		let vendorid = await getValue(endpoint, requestSensorVendorId);

		adapter.setObjectNotExists(`${idIoLink}.vendorid`, {
			type: 'state',
			common: {
				name: 'Vendor ID',
				role: 'value',
				type: 'string',
				value: vendorid,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idIoLink}.vendorid`, vendorid, true);


		adapter.setObjectNotExists(`${idIoLink}.sensorid`, {
			type: 'state',
			common: {
				name: 'Sensor ID',
				role: 'value',
				type: 'string',
				value: sensorid,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idIoLink}.sensorid`, sensorid, true);


		let serialnumber = await getValue(endpoint, requestDeviceSn);

		adapter.setObjectNotExists(`${idIoLink}.serialnumber`, {
			type: 'state',
			common: {
				name: 'Serial number',
				role: 'value',
				type: 'string',
				value: serialnumber,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idIoLink}.serialnumber`, serialnumber, true);


		//###############################################################################
		//Master process data

		let masterStatus = '';
		switch (await getValue(endpoint, requestMasterStatus)) {
			case 0:
				masterStatus = 'OK';
				break;
			case 1:
				masterStatus = 'Fault';
				break;
		}

		adapter.setObjectNotExists(`${idMasterProcessData}.status`, {
			type: 'state',
			common: {
				name: 'Supervision status',
				role: 'info.status',
				type: 'string',
				value: masterStatus,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idMasterProcessData}.status`, masterStatus, true);


		let current = await getValue(endpoint, requestMasterCurrent);

		let currentUnit = await getValue(endpoint, requestMasterCurrentUnit);

		adapter.setObjectNotExists(`${idMasterProcessData}.current`, {
			type: 'state',
			common: {
				name: 'Current',
				role: 'value.current',
				type: 'number',
				unit: currentUnit,
				value: current,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idMasterProcessData}.current`, current, true);


		let temperature = await getValue(endpoint, requestMasterTemperature);

		let temperatureUnit = await getValue(endpoint, requestMasterTemperatureUnit);

		adapter.setObjectNotExists(`${idMasterProcessData}.temperature`, {
			type: 'state',
			common: {
				name: 'Temperature',
				role: 'value.temperature',
				type: 'number',
				unit: temperatureUnit,
				value: temperature,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idMasterProcessData}.temperature`, temperature, true);


		let voltage = await getValue(endpoint, requestMasterVoltage);

		let voltageUnit = await getValue(endpoint, requestMasterVoltageUnit);

		adapter.setObjectNotExists(`${idMasterProcessData}.voltage`, {
			type: 'state',
			common: {
				name: 'Voltage',
				role: 'value.voltage',
				type: 'number',
				unit: voltageUnit,
				value: voltage,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idMasterProcessData}.voltage`, voltage, true);


		let bootloaderRev = await getValue(endpoint, requestMasterBootloaderRevision)

		adapter.setObjectNotExists(`${idMasterInfo}.bootloaderrev`, {
			type: 'state',
			common: {
				name: 'Bootloader revision',
				role: 'value',
				type: 'string',
				value: bootloaderRev,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idMasterInfo}.bootloaderrev`, bootloaderRev, true);


		let hardwareRev = await getValue(endpoint, requestMasterHardwareRevision);

		adapter.setObjectNotExists(`${idMasterInfo}.hardwarerev`, {
			type: 'state',
			common: {
				name: 'Hardware revision',
				role: 'value',
				type: 'string',
				value: hardwareRev,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idMasterInfo}.hardwarerev`, hardwareRev, true);


		let mac = await getValue(endpoint, requestMasterMac);

		adapter.setObjectNotExists(`${idMasterInfo}.mac`, {
			type: 'state',
			common: {
				name: 'MAC',
				role: 'info.mac',
				type: 'string',
				value: mac,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idMasterInfo}.mac`, mac, true);


		let softwareRev = await getValue(endpoint, requestMasterSoftwareRevision);

		adapter.setObjectNotExists(`${idMasterInfo}.softwarerev`, {
			type: 'state',
			common: {
				name: 'Software revision',
				role: 'value',
				type: 'string',
				value: softwareRev,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idMasterInfo}.softwarerev`, softwareRev, true);


		let masterSerial = await getValue(endpoint, requestMasterSerial);

		adapter.setObjectNotExists(`${idMasterInfo}.serial`, {
			type: 'state',
			common: {
				name: 'Serial number',
				role: 'value',
				type: 'string',
				value: masterSerial,
				read: true,
				write: false
			}
		});
		adapter.setState(`${idMasterInfo}.serial`, masterSerial, true);


		adapter.log.info('IO-Link adapter - fetching data completed');
		adapter.log.info('IO-Link adapter - shutting down until next scheduled call');
		adapter.stop();

	} catch (error) {
		adapter.log.info('IO-Link adapter - ERROR: ' + error);
		adapter.log.error(error);
		adapter.stop();
	}
}

const getValue = async (endpoint, request) => {
	var res = await axios({
		method: 'post',
		url: `http://${endpoint}`,
		data: request,
		headers: {'content-type': 'application/json'}
	});
	return res.data['data']['value'];
}

/**
 * @param {string} name
 */
function getIdString(name) {
	return name.replace(/[&\/\\#,+()$~%.'":*?<>{}\s]/g, '_').toLowerCase();
}

/**
 * @param {string} id
 * @param {string} name
 */
function generateChannelObject(id, name) {
	//TODO: manuell prüfen ob channel schon existiert?
	adapter.setObjectNotExists(id, {
		type: 'channel',
		common: {
			name: name,
			read: true,
			write: false
		}
	});
}

/**
 * @param {string} id
 * @param {any} name
 */
function generateDeviceObject(id, name) {
	//TODO: manuell prüfen ob device schon existiert?
	adapter.setObjectNotExists(id, {
		type: 'device',
		common: {
			name: name,
			read: true,
			write: false
		}
	});
}

/**
 * @param {string} id
 * @param {string} name
 * @param {string} role
 * @param {string} type
 * @param {string | number} value
 * @param {string} unit
 */
function generateStateObject(id, name, role, type, value, unit = '') {
	//TODO: manuell prüfen ob state schon existiert?
	adapter.setObjectNotExists(id, {
		type: 'state',
		common: {
			name: name,
			role: role,
			type: type,
			value: value,
			unit: unit,
			read: true,
			write: false
		}
	});
	adapter.setState(id, value, true);
}

/**
 * @param {string} adr
 */
function getRequestBody(adr) {
	return `{"code": "request", "cid": 1, "adr": "${adr}"}`;
}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Iolink(options);
} else {
	// otherwise start the instance directly
	new Iolink();
}