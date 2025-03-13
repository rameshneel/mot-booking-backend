import mongoose from "mongoose";
const customerSchema = new mongoose.Schema(
  {
    customerName: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String },
    contactNumber: { type: String, required: true },
    selectedDate: { type: Date, required: true },
    totalPrice: { type: Number },
    selectedTimeSlot: {
      type: String,
      enum: [
        "08:30",
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
        "16:30",
        "17:00",
        "17:30",
        "18:00",
      ],
      required: true,
    },
    makeAndModel: { type: String, required: true },
    registrationNo: { type: String, required: true },
    awareOfCancellationPolicy: {
      type: Boolean,
      default: false,
    },
    howDidYouHearAboutUs: {
      type: String,
      enum: [
        "Thomson Local",
        "BT Phonebook",
        "Touch Local",
        "We Love Local",
        "Trusted Places",
        "Yell.com",
        "118 247",
        "192.com",
        "Google",
        "Yahoo",
        "Radio",
        "Through a friend",
        "MSN",
        "Other",
      ],
    },
    paymentMethod: {
      type: String,
      enum: ["PayPal", "Cash"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    paypalOrderId: {
      type: String,
    },
    captureId: {
      type: String,
      required: false,
    },
    refundId: {
      type: String,
      required: false,
    },
    refundStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "reversed"],
      default: "pending",
    },
    refundAmount: {
      type: Number,
      required: false,
      min: 0,
    },
    refundReason: {
      type: String,
      required: false,
    },
    refundDate: {
      type: Date,
      required: false,
    },
    bookedBy: {
      type: String,
      enum: ["admin", "customer"],
    },
  },
  { timestamps: true }
);
customerSchema.pre("save", function (next) {
  this.customerName = this.firstName + " " + this.lastName;
  next();
});
const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
