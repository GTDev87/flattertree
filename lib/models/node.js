var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var NodeSchema = new Schema({
	//_id: String,
	name: String,
	path: String,
	type: String,
	tags: [],
	created_at: {type: Date, default: Date.now},
	data: { /*magic needs to happen in here*/ },
	template: {/* will hold all the properties at current level (if array or array-like approximation), if array-like common elements one level deeper */}
});

mongoose.model('Node', NodeSchema);