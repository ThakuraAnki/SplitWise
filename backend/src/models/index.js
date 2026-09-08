import mongoose from 'mongoose';
const {Schema, model} = mongoose;

// Schema for Group.
const groupSchema = new Schema(
    {
        name: { type: String, required: true, trim: true},
        memberIds: {
            type: [String],
            validate: {
                validator: (arr) => Array.isArray(arr) && arr.length >= 2,
                message: 'A group must have at least 2 members.',
            }
        },
    },
    { timestamps: true }
);


// Expense Schema
const expenseSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    description: { type: String, required: true, trim: true },
    totalAmount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'totalAmount must be an integer number of paise, never a float',
      },
    },
    paidBy: { type: String, required: true }, // a member handle
    splitType: { type: String, enum: ['equal', 'exact', 'percentage'], required: true },
    splits: [
      {
        _id: false,
        participantId: { type: String, required: true }, // a member handle
        amount: {
          type: Number,
          required: true,
          min: 0,
          validate: { validator: Number.isInteger, message: 'split amount must be an integer' },
        },
      },
    ],
    deletedAt: { type: Date, default: null },
    version: { type: Number, default: 0 }, // optimistic locking
  },
  { timestamps: true }
);

// Settlement Schema
const settlementSchema = new Schema(
    {
        groupId: {type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true},
        from: {type: String, required: true}, // a member handle
        to: {type: String, required: true}, // a member handle
        amount: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: 'settlement amount must be an integer number of paise, never a float',
            }
        },
        idempotencyKey: {type: String, required: true, unique: true},
    },
    { timestamps: true }
);


// TODO: Add users schema -> while setting up Authentication.

export const Group = model('Group', groupSchema);
export const Expense = model('Expense', expenseSchema);
export const Settlement = model('Settlement', settlementSchema);