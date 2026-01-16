import mongoose from "mongoose";
const { Schema } = mongoose;

const groupSchema = new Schema({
  groupname: { type: String, required: true, unique: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  expenses: [{ type: Schema.Types.ObjectId, ref: 'Expense' }] // just IDs
});

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
export default Group;
