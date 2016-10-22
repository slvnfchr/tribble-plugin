
'use strict';

/**
 * Graph class
 * @class Graph
 */

const Component = require('./component');
const Connection = require('./connection/component');
const IIPConnection = require('./connection/iip');
const InputPort = require('./port/input');
const OutputPort = require('./port/output');

function Graph() {
	const _components = []; // eslint-disable-line no-underscore-dangle
	const _connections = []; // eslint-disable-line no-underscore-dangle

	this.load = (module) => {
		_components.push(new Component(module));
	};

	this.initialize = (component, data) => {
		let port;
		let connection;
		Object.keys(data).forEach((name) => {
			port = new InputPort(component, name);
			connection = new IIPConnection();
			connection.connect(null, port); // Initial IP connection
			connection.putData(port.createIP(data[name]));
			if (_components.indexOf(component) === -1) _components.push(component);
			_connections.push(connection);
		});
	};

	this.connect = (upComponent, upPortName, downComponent, downPortName, capacity) => {
		let outport = upComponent.outports[upPortName];
		if (outport) {
			console.log(`Cannot connect one output port (${outport.name}) to multiple input ports`); // eslint-disable-line no-console
			return;
		}
		outport = new OutputPort(upComponent, upPortName);
		let inport = downComponent.inports[downPortName];
		let connection;
		if (inport == null) {
			inport = new InputPort(downComponent, downPortName);
			connection = new Connection(capacity);
			_connections.push(connection);
		} else {
			connection = inport.connection;
		}
		if (_components.indexOf(upComponent) === -1) _components.push(upComponent);
		if (_components.indexOf(downComponent) === -1) _components.push(downComponent);
		connection.connect(outport, inport);
	};

	this.run = (cb) => {
		_components.forEach((component) => {
			component.addListener(Component.events.STATE_CHANGE, () => this.check(cb));
		});
		const starters = _components.filter(component => Object.keys(component.inports).reduce((result, name) => result && component.inports[name].connection instanceof IIPConnection, true));
		starters.forEach(starter => starter.run(starters.length === 1));
		return starters; // eslint-disable-line no-console
	};

	this.check = (cb) => {
		let finish = true;
		_components.forEach((component) => {
			finish = finish && component.status === Component.status.CLOSED;
		});
		if (finish) cb.call();
	};

}

module.exports = Graph;