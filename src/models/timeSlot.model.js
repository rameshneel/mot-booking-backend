import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    slots: [
      {
        time: {
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
        bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
        blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

timeSlotSchema.virtual("slotsStatus").get(function () {
  return this.slots.map((slot) => {
    if (slot.blockedBy) {
      return { time: slot.time, status: "Blocked", blockedBy: slot.blockedBy };
    }
    if (slot.bookedBy) {
      return { time: slot.time, status: "Booked", bookedBy: slot.bookedBy };
    }
    return { time: slot.time, status: "Available" };
  });
});

timeSlotSchema.methods.getSlotStatus = function () {
  return this.slots.map((slot) => {
    if (slot.blockedBy) {
      return { time: slot.time, status: "Blocked", blockedBy: slot.blockedBy };
    }
    if (slot.bookedBy) {
      return { time: slot.time, status: "Booked", bookedBy: slot.bookedBy };
    }
    return { time: slot.time, status: "Available" };
  });
};

timeSlotSchema.index({ date: 1 }, { unique: true });

const TimeSlot = mongoose.model("TimeSlot", timeSlotSchema);

export default TimeSlot;
