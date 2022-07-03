//Credits: https://github.com/abalabahaha/eris/blob/dev/lib/util/Collection.js
module.exports = class Collection extends Map {
	constructor (baseObject) {
		super();
		this._baseObject = baseObject;
	}
	map (func) {
		const arr = [];
		for(const item of this.values()) {
			arr.push(func(item));
		}
		return arr;
	}

	add (object, extra, replace = false) {
		if (!object.id) throw new Error('Object need id');

		const existingObject = this.get(object.id);
		if (existingObject && !replace) {
			return existingObject;
		}

		if(!(object instanceof this._baseObject || object.constructor.name === this._baseObject.name)) {
			object = new this._baseObject(object, extra);
		}

		this.set(object.id, object);

		return object;
	}

	filter(func) {
		const arr = [];
		for(const item of this.values()) {
			if(func(item)) {
				arr.push(item);
			}
		}
		return arr;
	}

	find(func) {
		for(const item of this.values()) {
			if(func(item)) {
				return item;
			}
		}
		return undefined;
	}

	reduce(func, initialValue) {
		const iter = this.values();
		let val;
		let result = initialValue === undefined ? iter.next().value : initialValue;
		while((val = iter.next().value) !== undefined) {
			result = func(result, val);
		}
		return result;
	}

	remove(obj) {
		const item = this.get(obj.id);
		if(!item) {
			return null;
		}
		this.delete(obj.id);
		return item;
	}

	toString() {
		return `[Collection<${this._baseObject.name}>]`;
	}

	toJSON() {
		const json = {};
		for(const item of this.values()) {
			json[item.id] = item;
		}
		return json;
	}
};