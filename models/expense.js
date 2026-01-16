import mongoose from 'mongoose';
const { Schema } = mongoose;

const expenseSchema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  splitType: { type: String, enum: ['EQUAL', 'EXACT', 'PERCENT'], required: true },
  splits: [
    {
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      amount: { type: Number, required: true }
    }
  ]
}, { timestamps: true });

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
export default Expense;
