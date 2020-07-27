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
        const stationID = this.config.stationID.split(";");
		var stationIDs = "";
		
		for(const id in stationID){
			stationIDs = stationIDs + 'rbl=' + stationID[id] + '&';
		}
		this.log.debug(stationIDs);

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info('config senderKey: ' + this.config.senderKey);
        this.log.info('config stationID: ' + this.config.stationID);
		
		this.log.debug('request started');		
				
		request(
			{
				url: 'http://www.wienerlinien.at/ogd_realtime/monitor?' + stationIDs + 'sender=' + senderKey,
				json: true,
				time: true,
				timeout: 4500
			},
			(error, response, content) => {
				self.log.debug('remote request done');

				if (response) {
					self.log.debug('received data (' + response.statusCode + '): ' + JSON.stringify(content));

					self.setObjectNotExists('lastResponseCode', {
						type: 'state',
						common: {
							name: 'lastResponseCode',
							type: 'number',
							role: 'value',
							read: true,
							write: false
						},
						native: {}
					});
					self.setState('lastResponseCode', {val: response.statusCode, ack: true});

					self.setObjectNotExists('lastResponseTime', {
						type: 'state',
						common: {
							name: 'lastResponseTime',
							type: 'number',
							role: 'value',
							unit: 'ms',
							read: true,
							write: false
						},
						native: {}
					});
					self.setState('lastResponseTime', {val: parseInt(response.timingPhases.total), ack: true});

					if (!error && response.statusCode == 200) {
						if (content) {
							for(const key in content.data.monitors){
								const monitor = content.data.monitors[key];
								
								const station = monitor.locationStop.properties.title + ' - ' +  monitor.lines[0].towards + '.';
								
								self.setObjectNotExists(station + 'Station', {
									type: 'state',
									common: {
										name: 'Station',
										type: 'string',
										role: 'name',
									},
									native: {}
								});
								self.setState(station + 'Station', {val: monitor.locationStop.properties.title, ack: true});
								
								self.setObjectNotExists(station + 'Line', {
									type: 'state',
									common: {
										name: 'Line',
										type: 'string',
										role: 'name',
									},
									native: {}
								});
								self.setState(station + 'Line', {val: monitor.lines[0].name, ack: true});
								
								self.setObjectNotExists(station + 'Towards', {
									type: 'state',
									common: {
										name: 'Towards',
										type: 'string',
										role: 'name',
									},
									native: {}
								});
								self.setState(station + 'Towards', {val: monitor.lines[0].towards, ack: true});
								
								self.setObjectNotExists(station + 'StationBarrierFree', {
									type: 'state',
									common: {
										name: 'StationBarrierFree',
										type: 'bool',
										role: 'value',
									},
									native: {}
								});
								self.setState(station + 'StationBarrierFree', {val: monitor.lines[0].barrierFree, ack: true});
								
								
								
								for(const key in monitor.lines[0].departures.departure){
									const departure = monitor.lines[0].departures.departure[key];
								
									const d = 'Departure' + key.toString();
									
									self.setObjectNotExists(station + d, {
										type: 'state',
										common: {
											name: d,
											type: 'number',
											role: 'value',
											unit: 'min',
										},
										native: {}
									});
									self.setState(station + d, {val: departure.departureTime.countdown, ack: true});
									
									var vehicleBarrierFree = false;
									if(departure.hasOwnProperty('vehicle'){
										vehicleBarrierFree = departure.vehicle.barrierFree;
									}
									else{
										vehicleBarrierFree = monitor.lines[0].barrierFree;
									}
									
									self.setObjectNotExists(station + d + '_vehicleBarrierFree', {
										type: 'state',
										common: {
											name: d + '_vehicleBarrierFree',
											type: 'bool',
											role: 'value',
										},
										native: {}
									});
									self.setState(station + d + '_vehicleBarrierFree', {val: vehicleBarrierFree, ack: true});

								}
								
							}
						}
					}
						
				} else if (error) {
					self.log.warn(error);
				}
			}
		);
		
		
		
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