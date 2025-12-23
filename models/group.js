import mongoose from "mongoose";

const { Schema } = mongoose;

const expenseSchema = new Schema({
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  splitType: { type: String, enum: ['EQUAL', 'EXACT', 'PERCENT'], required: true },
  splits: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      amount: { type: Number, required: true }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

const groupSchema = new Schema({
  groupname: { type: String, required: true, unique: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  expenses: [expenseSchema]
});

// ✅ Prevent OverwriteModelError
const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
export default Group;
