'use strict';

/*
 * Created with @iobroker/create-adapter v1.26.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const request     = require('request');

// Load your modules here, e.g.:
// const fs = require("fs");

class Wienerlinien extends utils.Adapter {

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'wienerlinien',
        });
		this.killTimeout = null;
        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here
		const self = this;
		
		const senderKey = this.config.senderKey;
        const stationID = this.config.stationID;

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info('config senderKey: ' + this.config.senderKey);
        this.log.info('config stationID: ' + this.config.stationID);
		
		this.log.debug('request started');
		
		request(
                    {
                        url:  'http://www.wienerlinien.at/ogd_realtime/monitor?rbl=' + stationID +'&sender=' + senderKey + '/',
                        json: true,
                        time: true,
                        timeout: 4500
                    },
                    (error, response, content) => {
                        self.log.debug('request done');

                        if (response) {
                            self.log.debug('received data (' + response.statusCode + '): ' + JSON.stringify(content));

                            self.setObjectNotExists(path + 'responseCode', {
                                type: 'state',
                                common: {
                                    name: 'responseCode',
                                    type: 'number',
                                    role: 'value',
                                    read: true,
                                    write: false
                                },
                                native: {}
                            });
                            self.setState(path + 'responseCode', {val: response.statusCode, ack: true});

                            self.setObjectNotExists(path + 'responseTime', {
                                type: 'state',
                                common: {
                                    name: 'responseTime',
                                    type: 'number',
                                    role: 'value',
                                    unit: 'ms',
                                    read: true,
                                    write: false
                                },
                                native: {}
                            });
                            self.setState(path + 'responseTime', {val: parseInt(response.timingPhases.total), ack: true});

                            if (!error && response.statusCode == 200) {
                                if (content && Array.isArray(content)) {
                                    const sensorData = content[0];

                                    if (Object.prototype.hasOwnProperty.call(sensorData, 'sensordatavalues')) {
                                        for (const key in sensorData.sensordatavalues) {
                                            const obj = sensorData.sensordatavalues[key];

                                            let unit = null;
                                            let role = 'value';

                                            if (Object.prototype.hasOwnProperty.call(unitList, obj.value_type)) {
                                                unit = unitList[obj.value_type];
                                                role = roleList[obj.value_type];
                                            }

                                            self.setObjectNotExists(path + 'SDS_' + obj.value_type, {
                                                type: 'state',
                                                common: {
                                                    name: obj.value_type,
                                                    type: 'number',
                                                    role: role,
                                                    unit: unit,
                                                    read: true,
                                                    write: false
                                                },
                                                native: {}
                                            });
                                            self.setState(path + 'SDS_' + obj.value_type, {val: parseFloat(obj.value), ack: true});
                                        }
                                    } else {
                                        self.log.warn('Response has no valid content. Check hostname/IP address and try again.');
                                    }

                                    if (Object.prototype.hasOwnProperty.call(sensorData, 'location')) {
                                        self.setObjectNotExists(path + 'location', {
                                            type: 'channel',
                                            common: {
                                                name: 'Location',
                                                role: 'value.gps'
                                            },
                                            native: {}
                                        });

                                        self.setObjectNotExists(path + 'location.longitude', {
                                            type: 'state',
                                            common: {
                                                name: 'Longtitude',
                                                type: 'number',
                                                role: 'value.gps.longitude',
                                                unit: '°',
                                                read: true,
                                                write: false
                                            },
                                            native: {}
                                        });
                                        self.setState(path + 'location.longitude', {val: sensorData.location.longitude, ack: true});

                                        self.setObjectNotExists(path + 'location.latitude', {
                                            type: 'state',
                                            common: {
                                                name: 'Latitude',
                                                type: 'number',
                                                role: 'value.gps.latitude',
                                                unit: '°',
                                                read: true,
                                                write: false
                                            },
                                            native: {}
                                        });
                                        self.setState(path + 'location.latitude', {val: sensorData.location.latitude, ack: true});

                                        self.setObjectNotExists(path + 'location.altitude', {
                                            type: 'state',
                                            common: {
                                                name: 'Altitude',
                                                type: 'number',
                                                role: 'value.gps.elevation',
                                                unit: 'm',
                                                read: true,
                                                write: false
                                            },
                                            native: {}
                                        });
                                        self.setState(path + 'location.altitude', {val: sensorData.location.altitude, ack: true});

                                        self.setObjectNotExists(path + 'timestamp', {
                                            type: 'state',
                                            common: {
                                                name: 'Last Update',
                                                type: 'string',
                                                role: 'date',
                                                read: true,
                                                write: false
                                            },
                                            native: {}
                                        });
                                        self.setState(path + 'timestamp', {val: sensorData.timestamp, ack: true});
                                    }
                                }
                            }
                        } else if (error) {
                            self.log.warn(error);
                        }
                    }
                );
            }
        } else {
            this.log.debug('sensor type and/or sensor identifier not defined');
        }
		
		
		
		
		
		
		
		

        /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */
        await this.setObjectNotExistsAsync('testVariable', {
            type: 'state',
            common: {
                name: 'testVariable',
                type: 'boolean',
                role: 'indicator',
                read: true,
                write: true,
            },
            native: {},
        });

        // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
        this.subscribeStates('testVariable');
        // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
        // this.subscribeStates('lights.*');
        // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
        // this.subscribeStates('*');

        /*
            setState examples
            you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
        */
        // the variable testVariable is set to true as command (ack=false)
        await this.setStateAsync('testVariable', true);

        // same thing, but the value is flagged "ack"
        // ack should be always set to true if the value is received from or acknowledged from the target system
        await this.setStateAsync('testVariable', { val: true, ack: true });

        // same thing, but the state is deleted after 30s (getState will return null afterwards)
        await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

        // examples for the checkPassword/checkGroup functions
        let result = await this.checkPasswordAsync('admin', 'iobroker');
        this.log.info('check user admin pw iobroker: ' + result);

        result = await this.checkGroupAsync('admin', 'admin');
        this.log.info('check group user admin group admin: ' + result);
		
		
		
		this.killTimeout = setTimeout(this.stop.bind(this), 10000);
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            if (this.killTimeout) {
                this.log.debug('clearing kill timeout');
                clearTimeout(this.killTimeout);
            }

            this.log.debug('cleaned everything up...');

            callback();
        } catch (e) {
            callback();
        }
    }

   

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Wienerlinien(options);
} else {
    // otherwise start the instance directly
    new Wienerlinien();
}