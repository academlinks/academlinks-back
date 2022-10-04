import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const RefresherSchema = new Schema({
  refresher: String,
});

const Refresher = model('Refresher', RefresherSchema);

export default Refresher;
