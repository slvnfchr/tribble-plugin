
'use strict';

/**
 * Graph class
 * @class Graph
 */

const Component = require('./Component');
const Connection = require('./connection/Component');
const IIPConnection = require('./connection/IIP');
const InputPort = require('./port/Input');
const OutputPort = require('./port/Output');

class Graph {

	constructor() {

		const _components = []; // eslint-disable-line no-underscore-dangle
		const _connections = []; // eslint-disable-line no-underscore-dangle

		this.add = (component) => {
			if (_components.indexOf(component) === -1) _components.push(component);
		};

		this.initialize = (component, data) => {
			let port;
			let connection;
			const values = (typeof data === 'object') ? data : { in: data };
			Object.keys(values).forEach((name) => {
				port = new InputPort(component, name);
				connection = new IIPConnection();
				connection.connect(null, port); // Initial IP connection
				connection.putData(values[name]);
				this.add(component);
				_connections.push(connection);
			});
		};

		this.connect = (upComponent, upPortName, downComponent, downPortName, capacity) => {
			let outport = upComponent.output[upPortName];
			if (outport) {
				console.log(`Cannot connect one output port (${outport.name}) to multiple input ports`); // eslint-disable-line no-console
				return;
			}
			outport = new OutputPort(upComponent, upPortName);
			let inport = downComponent.input[downPortName];
			let connection;
			if (inport == null) {
				inport = new InputPort(downComponent, downPortName);
				connection = new Connection(capacity);
				_connections.push(connection);
			} else {
				connection = inport.connection;
			}
			this.add(upComponent);
			this.add(downComponent);
			connection.connect(outport, inport);
		};

		const _check = (cb) => { // eslint-disable-line no-underscore-dangle
			let finish = true;
			_components.forEach((component) => {
				finish = finish && component.status === Component.status.DONE;
			});
			if (finish && cb) {
				_components.forEach((component) => {
					component.removeAllListeners(Component.events.STATE_CHANGE);
				});
				cb.call();
			}
		};

		this.run = (cb) => {
			_components.forEach((component) => {
				component.addListener(Component.events.STATE_CHANGE, () => _check(cb));
			});
			const starters = _components.filter(component => Object.keys(component.input).reduce((result, name) => result && component.input[name].connection instanceof IIPConnection, true));
			starters.forEach((starter) => {
				starter.initialize();
				starter.activate();
				starter.execute();
			});
			return starters; // eslint-disable-line no-console
		};

	}

}

module.exports = Graph;
