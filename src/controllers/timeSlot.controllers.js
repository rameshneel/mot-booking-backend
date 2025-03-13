import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import TimeSlot from "../models/timeSlot.model.js";

async function getAvailableSlots(date) {
  const timeSlot = await TimeSlot.findOne({ date })
    .populate("slots.bookedBy")
    .populate("slots.blockedBy");

  if (!timeSlot) {
    return "No time slots available for this date.";
  }

  const availableSlots = timeSlot.slots.map((slot) => {
    if (slot.blockedBy) {
      return { time: slot.time, status: "Blocked", blockedBy: slot.blockedBy };
    }
    if (slot.bookedBy) {
      return { time: slot.time, status: "Booked", bookedBy: slot.bookedBy };
    }
    return { time: slot.time, status: "Available" };
  });
  console.log("avddd", availableSlots);

  return availableSlots;
}
const DEFAULT_TIME_SLOTS = [
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
];
const getAvailableSlotsForDate = async (date) => {
  const timeSlot = await TimeSlot.findOne({ date });

  return DEFAULT_TIME_SLOTS.map((slotTime) => {
    const existingSlot = timeSlot?.slots.find((s) => s.time === slotTime);

    if (existingSlot) {
      if (existingSlot.bookedBy)
        return {
          time: slotTime,
          status: "Booked",
          bookedBy: existingSlot.bookedBy,
        };
      if (existingSlot.blockedBy)
        return {
          time: slotTime,
          status: "Blocked",
          blockedBy: existingSlot.blockedBy,
        };
    }

    return { time: slotTime, status: "Available" };
  });
};
const getAvailableTimeSlotsForForm = asyncHandler(async (req, res) => {
  console.log("testing");

  const { date } = req.query;
  if (!date) throw new ApiError(400, "Date is required.");

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0); // Normalize the date

  const slotsWithStatus = await getAvailableSlotsForDate(parsedDate);
  res
    .status(200)
    .json(
      new ApiResponse(200, slotsWithStatus, "Time slots fetched successfully")
    );
});
const getDisabledDates = asyncHandler(async (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    throw new ApiError(400, "Year aur month required hai.");
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  console.log("Start Date:", startDate);
  console.log("End Date:", endDate);

  const disabledDates = await TimeSlot.aggregate([
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $addFields: {
        totalSlots: { $size: { $ifNull: ["$slots", []] } },
        unavailableSlots: {
          $size: {
            $filter: {
              input: { $ifNull: ["$slots", []] },
              as: "slot",
              cond: { $ne: ["$$slot.blockedBy", null] },
            },
          },
        },
      },
    },
    {
      $match: {
        $expr: {
          $and: [
            { $eq: ["$totalSlots", { $literal: DEFAULT_TIME_SLOTS.length }] },
            { $eq: ["$totalSlots", "$unavailableSlots"] },
          ],
        },
      },
    },
    {
      $project: {
        date: 1,
        _id: 0,
      },
    },
  ]);

  console.log("Disabled Dates:", disabledDates); // Debugging line to check output

  res.json(
    new ApiResponse(200, disabledDates, "Disabled dates fetched successfully")
  );
});
const blockTimeSlots = asyncHandler(async (req, res) => {
  const { date, slots } = req.body;
  if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
    throw new ApiError(
      400,
      "Invalid input. Please provide a date and an array of slots to block."
    );
  }

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0);

  // Find the time slot for the given date
  let timeSlot = await TimeSlot.findOne({ date: parsedDate });

  if (!timeSlot) {
    // If no time slot exists for the date, create a new one
    timeSlot = new TimeSlot({ date: parsedDate, slots: [] });
  }

  // Check and block the requested slots
  slots.forEach((slot) => {
    const existingSlot = timeSlot.slots.find((s) => s.time === slot);

    if (existingSlot) {
      if (existingSlot.bookedBy) {
        throw new ApiError(
          400,
          `Slot ${slot} is already booked and cannot be blocked.`
        );
      }
      if (existingSlot.blockedBy) {
        throw new ApiError(400, `Slot ${slot} is already blocked.`);
      }
      existingSlot.blockedBy = req.user._id; // Track who blocked it
    } else {
      // If the slot doesn't exist, create it as blocked
      timeSlot.slots.push({ time: slot, blockedBy: req.user._id });
    }
  });

  await timeSlot.save();
  res.json(new ApiResponse(200, timeSlot, "Time slots blocked successfully"));
});
const unblockTimeSlots = asyncHandler(async (req, res) => {
  const { date, slots } = req.body;

  if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
    throw new ApiError(
      400,
      "Invalid input. Please provide a date and an array of slots to unblock."
    );
  }

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0);

  const timeSlot = await TimeSlot.findOne({ date: parsedDate });

  if (!timeSlot) {
    throw new ApiError(404, "No time slots found for the given date.");
  }

  slots.forEach((slot) => {
    const existingSlot = timeSlot.slots.find((s) => s.time === slot);

    if (!existingSlot) {
      throw new ApiError(404, `Slot ${slot} not found on this date.`);
    }

    // Check if the slot is blocked
    if (existingSlot.blockedBy) {
      if (String(existingSlot.blockedBy) !== String(req.user._id)) {
        throw new ApiError(403, "You cannot unblock a slot you didn't block.");
      }
      // Unblock the slot
      existingSlot.blockedBy = null;
    } else {
      throw new ApiError(400, `Slot ${slot} is not blocked.`);
    }
  });

  await timeSlot.save();
  res.json(new ApiResponse(200, timeSlot, "Time slots unblocked successfully"));
});
const getAvailableTimeSlots = asyncHandler(async (req, res) => {
  const { date } = req.query; // Date ko query parameter se lete hain

  if (!date) {
    throw new ApiError(400, "Date is required.");
  }

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0);

  // Default time slots
  const defaultSlots = [
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
  ];

  // Fetch time slots for the given date
  const timeSlot = await TimeSlot.findOne({ date: parsedDate });

  // Initialize slots with their statuses
  const slotsWithStatus = defaultSlots.map((slotTime) => {
    const existingSlot = timeSlot
      ? timeSlot.slots.find((s) => s.time === slotTime)
      : null;

    if (existingSlot) {
      if (existingSlot.bookedBy) {
        return {
          time: slotTime,
          status: "Booked",
          bookedBy: existingSlot.bookedBy,
        };
      }
      if (existingSlot.blockedBy) {
        return {
          time: slotTime,
          status: "Blocked",
          blockedBy: existingSlot.blockedBy,
        };
      }
    }

    return { time: slotTime, status: "Available" };
  });

  res.json(
    new ApiResponse(200, slotsWithStatus, "Time slots fetched successfully")
  );
});

export {
  blockTimeSlots,
  unblockTimeSlots,
  getAvailableTimeSlots,
  getAvailableTimeSlotsForForm,
  getDisabledDates,
};

// const getDisabledDates = asyncHandler(async (req, res) => {
//   const { year, month } = req.query;

//   if (!year || !month) {
//     throw new ApiError(400, "Year aur month required hai.");
//   }

//   const startDate = new Date(year, month - 1, 1);
//   const endDate = new Date(year, month, 0);
//   console.log("Start Date:", startDate);
//   console.log("End Date:", endDate);

//   // const disabledDates = await TimeSlot.aggregate([
//   //   {
//   //     $match: {
//   //       date: { $gte: startDate, $lte: endDate }
//   //     }
//   //   },
//   //   {
//   //     $project: {
//   //       date: 1,
//   //       totalSlots: { $size: "$slots" },
//   //       allSlotsBlocked: {
//   //         $eq: [
//   //           { $size: { $filter: { input: "$slots", as: "slot", cond: { $eq: ["$$slot.blockedBy", null] } } } },
//   //           0
//   //         ]
//   //       }
//   //     }
//   //   },
//   //   {
//   //     $match: {
//   //       totalSlots: { $eq: DEFAULT_TIME_SLOTS.length }, // Check for total slots
//   //       allSlotsBlocked: true // Check for all slots blocked
//   //     }
//   //   },
//   //   { $project: { _id: 1, date: 1 } } // Return only date and _id
//   // ]);
//   // const disabledDates = await TimeSlot.aggregate([
//   //   {
//   //     $match: {
//   //       date: {
//   //         $gte: startDate,
//   //         $lte: endDate
//   //       }
//   //     }
//   //   },
//   //   {
//   //     $project: {
//   //       date: 1,
//   //       allSlotsBlocked: {
//   //         $eq: [
//   //           { $size: { $filter: {
//   //               input: "$slots",
//   //               as: "slot",
//   //               cond: {
//   //                 $or: [
//   //                   { $ne: ["$$slot.blockedBy", null] },
//   //                   { $ne: ["$$slot.bookedBy", null] }
//   //                 ]
//   //               }
//   //             }
//   //           }},
//   //           DEFAULT_TIME_SLOTS.length // Check if this equals the total number of default slots
//   //         ]
//   //       }
//   //     }
//   //   },
//   //   {
//   //     $match: {
//   //       allSlotsBlocked: true
//   //     }
//   //   }
//   // ]);
//   const disabledDates = await TimeSlot.aggregate([
//     {
//       $match: {
//         date: {
//           $gte: startDate,
//           $lte: endDate
//         }
//       }
//     },
//     {
//       $project: {
//         date: 1,
//         filteredSlots: {
//           $filter: {
//             input: { $ifNull: ["$slots", []] }, // Ensure slots is an array
//             as: "slot",
//             cond: {
//               $or: [
//                 { $ne: ["$$slot.blockedBy", null] },
//                 { $ne: ["$$slot.bookedBy", null] }
//               ]
//             }
//           }
//         },
//         totalSlots: { $size: { $ifNull: ["$slots", []] } } // Ensure totalSlots is calculated safely
//       }
//     },
//     {
//       $addFields: {
//         allSlotsBlocked: {
//           $eq: [
//             { $size: {
//                 $filter: {
//                   input: { $ifNull: ["$slots", []] }, // Ensure slots is an array
//                   as: "slot",
//                   cond: {
//                     $and: [
//                       { $ne: ["$$slot.blockedBy", null] },
//                       { $ne: ["$$slot.bookedBy", null] }
//                     ]
//                   }
//                 }
//               }
//             },
//             DEFAULT_TIME_SLOTS.length
//           ]
//         }
//       }
//     },
//     {
//       $match: {
//         allSlotsBlocked: true
//       }
//     }
//   ]);

//   console.log("Disabled Dates:", disabledDates); // Debugging line to check output

//   res.json(new ApiResponse(200, disabledDates, "Disabled dates fetched successfully"));
// });

// const getDisabledDates = asyncHandler(async (req, res) => {
//   const { year, month } = req.query;

//   if (!year || !month) {
//     throw new ApiError(400, "Year aur month required hai.");
//   }

//   const startDate = new Date(year, month - 1, 1);
//   const endDate = new Date(year, month, 0);
//   console.log("start date ,", startDate);
//   console.log("end date ,", endDate);

//   const disabledDates = await TimeSlot.aggregate([
//     {
//       $match: {
//         date: { $gte: startDate, $lte: endDate }
//       }
//     },
//     {
//       $project: {
//         date: 1,
//         totalSlots: { $size: "$slots" },
//         allSlotsBlocked: {
//           $eq: [
//             { $size: { $filter: { input: "$slots", as: "slot", cond: { $eq: ["$$slot.blockedBy", null] } } } },
//             0
//           ]
//         }
//       }
//     },
//     {
//       $match: {
//         totalSlots: { $eq: DEFAULT_TIME_SLOTS.length }, // Ensure it has all default slots
//         allSlotsBlocked: true // Keep only dates where all slots are blocked
//       }
//     },
//     { $project: { _id: 1, date: 1 } }
//   ]);
//   console.log("diable dates",disabledDates);

//   res.json(new ApiResponse(200, disabledDates, "Disabled dates fetched successfully"));
// });

// const getAvailableTimeSlots = asyncHandler(async (req, res) => {
//   const { date } = req.query;
//   if (!date) {
//     throw new ApiError(
//       400,
//       "Please provide a date to get available time slots."
//     );
//   }

//   const parsedDate = new Date(date);
//   parsedDate.setUTCHours(0, 0, 0, 0);
//   const av = getAvailableSlots(parsedDate);

//   const availableSlots = [
//     "9:00-9:45 AM",
//     "9:45-10:30 AM",
//     "10:30-11:15 AM",
//     "11:15-12:00 PM",
//     "12:00-12:45 PM",
//     "12:45-1:30 PM",
//     "1:30-2:15 PM",
//     "2:15-3:00 PM",
//   ];

//   const timeSlot = await TimeSlot.findOne({ date: parsedDate });

//   let slotStatus;

//   if (timeSlot) {
//     slotStatus = timeSlot.getSlotStatus();
//     console.log("slots fffh",slotStatus);

//   } else {
//     // Agar time slot model me nahi hai to saare slots available maano
//     slotStatus = availableSlots.map((time) => ({
//       time,
//       status: "Available",
//     }));
//   }

//   // console.log(slotStatus);
//   console.log("timeslot", timeSlot);

//   const allSlots = [
//     "9:00-9:45 AM",
//     "9:45-10:30 AM",
//     "10:30-11:15 AM",
//     "11:15-12:00 PM",
//     "12:00-12:45 PM",
//     "12:45-1:30 PM",
//     "1:30-2:15 PM",
//     "2:15-3:00 PM",
//   ];

//   // let availableSlots;

//   // if (!timeSlot) {
//   //   availableSlots = allSlots;
//   // } else {
//   //   availableSlots = allSlots.filter((slot) => {
//   //     const existingSlot = timeSlot.slots.find((s) => s.time === slot);
//   //     return (
//   //       !existingSlot || (!existingSlot.isBlocked && !existingSlot.bookedBy)
//   //     );
//   //   });
//   // }

//   res.json(
//     new ApiResponse(
//       200,
//       { availableSlots },
//       "Available time slots retrieved successfully"
//     )
//   );
// });

// const blockTimeSlots = asyncHandler(async (req, res) => {
//   const { date, slots } = req.body;

//   if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
//     throw new ApiError(400, "Invalid input. Please provide a date and an array of slots to block.");
//   }

//   const parsedDate = new Date(date);
//   parsedDate.setUTCHours(0, 0, 0, 0);

//   // Find the time slot for the given date
//   const timeSlot = await TimeSlot.findOne({ date: parsedDate });

//   if (timeSlot) {
//     // Check if any slots are booked for this date
//     const bookedSlots = timeSlot.slots.filter(s => s.bookedBy);
//     if (bookedSlots.length > 0) {
//       throw new ApiError(400, "Cannot block slots on a date that has booked slots.");
//     }
//   } else {
//     // If no time slot exists for the date, create a new one
//     timeSlot = new TimeSlot({ date: parsedDate, slots: [] });
//   }

//   // Block the requested slots
//   slots.forEach((slot) => {
//     const existingSlot = timeSlot.slots.find((s) => s.time === slot);
//     if (existingSlot) {
//       if (existingSlot.blockedBy) {
//         throw new ApiError(400, `Slot ${slot} is already blocked.`);
//       }
//       existingSlot.blockedBy = req.user._id; // Track who blocked it
//     } else {
//       // If the slot doesn't exist, create it as blocked
//       timeSlot.slots.push({ time: slot, blockedBy: req.user._id });
//     }
//   });

//   await timeSlot.save();
//   res.json(new ApiResponse(200, timeSlot, "Time slots blocked successfully"));
// });

// const blockTimeSlots = asyncHandler(async (req, res) => {
//   const { date, slots } = req.body;

//   if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
//     throw new ApiError(
//       400,
//       "Invalid input. Please provide a date and an array of slots to block."
//     );
//   }

//   const parsedDate = new Date(date);
//   parsedDate.setUTCHours(0, 0, 0, 0);

//   let timeSlot = await TimeSlot.findOne({ date: parsedDate });

//   if (!timeSlot) {
//     timeSlot = new TimeSlot({ date: parsedDate, slots: [] });
//   }

//   // Check if any slot is booked before blocking
//   const bookedSlots = timeSlot.slots.filter((s) => s.bookedBy);
//   if (bookedSlots.length > 0) {
//     throw new ApiError(
//       400,
//       "Cannot block slots on a date that has booked slots."
//     );
//   }

//   slots.forEach((slot) => {
//     const existingSlot = timeSlot.slots.find((s) => s.time === slot);
//     if (existingSlot) {
//       if (existingSlot.bookedBy) {
//         throw new ApiError(
//           400,
//           `Slot ${slot} is already booked by a customer and cannot be blocked.`
//         );
//       }
//       existingSlot.isBlocked = true;
//       existingSlot.blockedBy = req.user._id; // Track who blocked it
//     } else {
//       timeSlot.slots.push({
//         time: slot,
//         isBlocked: true,
//         blockedBy: req.user._id,
//       });
//     }
//   });

//   await timeSlot.save();
//   res.json(new ApiResponse(200, timeSlot, "Time slots blocked successfully"));
// });
// const unblockTimeSlots = asyncHandler(async (req, res) => {
//   const { date, slots } = req.body;

//   if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
//     throw new ApiError(
//       400,
//       "Invalid input. Please provide a date and an array of slots to unblock."
//     );
//   }

//   const parsedDate = new Date(date);
//   parsedDate.setUTCHours(0, 0, 0, 0);

//   const timeSlot = await TimeSlot.findOne({ date: parsedDate });

//   if (!timeSlot) {
//     throw new ApiError(404, "No time slots found for the given date.");
//   }

//   slots.forEach((slot) => {
//     const existingSlot = timeSlot.slots.find((s) => s.time === slot);
//   console.log("exting slot",existingSlot);

//     if (!existingSlot) {
//       throw new ApiError(404, `Slot ${slot} not found on this date.`);
//     }

//     if (existingSlot.blockedBy) {
//       if (String(existingSlot.blockedBy) !== String(req.user._id)) {
//         throw new ApiError(403, "You cannot unblock a slot you didn't block.");
//       }
//       existingSlot.isBlocked = false;
//       existingSlot.blockedBy = null;
//     } else {
//       throw new ApiError(400, `Slot ${slot} is not blocked.`);
//     }
//   });

//   await timeSlot.save();
//   res.json(new ApiResponse(200, timeSlot, "Time slots unblocked successfully"));
// });

// const unblockTimeSlots = asyncHandler(async (req, res) => {
//   const { date, slots } = req.body;

//   if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
//     throw new ApiError(400, "Invalid input. Please provide a date and an array of slots to unblock.");
//   }

//   const parsedDate = new Date(date);
//   parsedDate.setUTCHours(0, 0, 0, 0);

//   const timeSlot = await TimeSlot.findOne({ date: parsedDate });

//   if (!timeSlot) {
//     throw new ApiError(404, "No time slots found for the given date.");
//   }

//   slots.forEach((slot) => {
//     const existingSlot = timeSlot.slots.find((s) => s.time === slot);
//     if (existingSlot) {
//       if (existingSlot.isBlocked) {
//         if (String(existingSlot.blockedBy) !== String(req.user._id)) {
//           throw new ApiError(403, "You cannot unblock a slot you didn't block.");
//         }
//         existingSlot.isBlocked = false;
//         existingSlot.blockedBy = null;
//       } else {
//         throw new ApiError(400, `Slot ${slot} is not blocked.`);
//       }
//     } else {
//       throw new ApiError(404, `Slot ${slot} not found on this date.`);
//     }
//   });

//   await timeSlot.save();
//   res.json(new ApiResponse(200, timeSlot, "Time slots unblocked successfully"));
// });

// const blockTimeSlots = asyncHandler(async (req, res) => {
//   const { date, slots } = req.body;
//   // const {fullname,email,_id}=req.user
//   if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
//     throw new ApiError(
//       400,
//       "Invalid input. Please provide a date and an array of slots to block."
//     );
//   }

//   const parsedDate = new Date(date);
//   parsedDate.setUTCHours(0, 0, 0, 0);

//   let timeSlot = await TimeSlot.findOne({ date: parsedDate });

//   if (!timeSlot) {
//     timeSlot = new TimeSlot({ date: parsedDate, slots: [] });
//   }

//   slots.forEach((slot) => {
//     const existingSlot = timeSlot.slots.find((s) => s.time === slot);
//     if (existingSlot) {
//       if (existingSlot.bookedBy) {
//         throw new ApiError(
//           400,
//           `Slot ${slot} is already booked by a customer and cannot be blocked.`
//         );
//       }
//       existingSlot.isBlocked = true;
//       existingSlot.blockedBy = req.user._id; // Track who blocked it
//     } else {
//       timeSlot.slots.push({ time: slot, isBlocked: true, blockedBy: req.user._id });
//     }
//   });
//   await timeSlot.save();
//   res.json(new ApiResponse(200, timeSlot, "Time slots blocked successfully"));
// });
// const unblockTimeSlots = asyncHandler(async (req, res) => {
//   const { date, slots } = req.body;

//   if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
//     throw new ApiError(
//       400,
//       "Invalid input. Please provide a date and an array of slots to unblock."
//     );
//   }

//   const parsedDate = new Date(date);
//   parsedDate.setUTCHours(0, 0, 0, 0);

//   const timeSlot = await TimeSlot.findOne({ date: parsedDate });

//   if (!timeSlot) {
//     throw new ApiError(404, "No time slots found for the given date.");
//   }

//   if (existingSlot && existingSlot.isBlocked) {
//     if (String(existingSlot.blockedBy) !== String(req.user._id)) {
//       throw new ApiError(403, "You cannot unblock a slot you didn't block.");
//     }
//     existingSlot.isBlocked = false;
//     existingSlot.blockedBy = null;
//   }

//   await timeSlot.save();

//   res.json(new ApiResponse(200, timeSlot, "Time slots unblocked successfully"));
// });

// import Customer from "../models/customer.model.js";
// import TimeSlot from "../models/timeSlotmodel.js";
// import { ApiError } from "../utils/ApiError.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import { asyncHandler } from "../utils/asyncHandler.js";

// const blockTimeSlots = asyncHandler(async (req, res, next) => {
//   try {
//     const { date, slots } = req.body;

//     if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
//       throw new ApiError(400, "Invalid input. Date and non-empty slots array are required.");
//     }

//     const formattedDate = new Date(date);
//     formattedDate.setUTCHours(0, 0, 0, 0);
//     console.log("formatted", formattedDate);

//     const results = await Promise.all(slots.map(async (slot) => {
//       // Check if the slot exists
//       const existingSlot = await TimeSlot.findOne({
//         date: formattedDate,
//         slot: slot
//       });

//       if (existingSlot) {
//         if (existingSlot.bookedBy) {
//           return { slot, status: 'already_booked' };
//         }
//         if (existingSlot.isBlocked) {
//           return { slot, status: 'already_blocked' };
//         }
//         // Update existing slot
//         existingSlot.isBlocked = true;
//         await existingSlot.save();
//         return { slot, status: 'blocked' };
//       } else {
//         // Create new slot
//         await TimeSlot.create({
//           date: formattedDate,
//           slot: slot,
//           isBlocked: true
//         });
//         return { slot, status: 'blocked' };
//       }
//     }));

//     console.log("result abc", results);

//     const summary = results.reduce((acc, result) => {
//       acc[result.status] = (acc[result.status] || 0) + 1;
//       return acc;
//     }, {});

//     console.log("summary", summary);

//     // Check for already booked slots and collect available slots
//     const alreadyBookedSlots = results.filter(result => result.status === 'already_booked');
//     const availableSlots = results.filter(result => result.status === 'blocked');

//     if (alreadyBookedSlots.length > 0) {
//       const bookedSlotList = alreadyBookedSlots.map(result => result.slot).join(', ');
//       throw new ApiError(400, `Cannot block already booked slots: ${bookedSlotList}`);
//     }

//     res.status(200).json(new ApiResponse(200, { results, summary }, "Time slots processed successfully"));
//   } catch (error) {
//     next(error);
//   }
// });

// // const blockTimeSlots = asyncHandler(async (req, res, next) => {
// //   try {
// //     const { date, slots } = req.body;

// //     if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
// //       throw new ApiError(400, "Invalid input. Date and non-empty slots array are required.");
// //     }

// //     const formattedDate = new Date(date);
// //     formattedDate.setUTCHours(0, 0, 0, 0);

// //     const results = await Promise.all(slots.map(async (slot) => {
// //       // Check if the slot exists
// //       const existingSlot = await TimeSlot.findOne({
// //         date: formattedDate,
// //         slot: slot
// //       });

// //       if (existingSlot) {
// //         if (existingSlot.bookedBy) {
// //           return { slot, status: 'already_booked' };
// //         }
// //         if (existingSlot.isBlocked) {
// //           return { slot, status: 'already_blocked' };
// //         }
// //         // Update existing slot
// //         existingSlot.isBlocked = true;
// //         await existingSlot.save();
// //         return { slot, status: 'blocked' };
// //       } else {
// //         // Create new slot
// //         await TimeSlot.create({
// //           date: formattedDate,
// //           slot: slot,
// //           isBlocked: true
// //         });
// //         return { slot, status: 'blocked' };
// //       }
// //     }));

// //     const summary = results.reduce((acc, result) => {
// //       acc[result.status] = (acc[result.status] || 0) + 1;
// //       return acc;
// //     }, {});

// //     // Check if any slots were already booked
// //     const alreadyBookedSlots = results.filter(result => result.status === 'already_booked');
// //     if (alreadyBookedSlots.length > 0) {
// //       const bookedSlotList = alreadyBookedSlots.map(result => result.slot).join(', ');
// //       throw new ApiError(400, `Cannot block already booked slots: ${bookedSlotList}`);
// //     }

// //     res.status(200).json(new ApiResponse(200, { results, summary }, "Time slots processed successfully"));
// //   } catch (error) {
// //     next(error);
// //   }
// // });

// // const blockTimeSlots = asyncHandler(async (req, res, next) => {
// //     try {
// //       const { date, slots } = req.body;

// //       if (!date || !slots || !Array.isArray(slots)) {
// //         throw new ApiError(400, "Invalid input. Date and slots array are required.");
// //       }

// //       const formattedDate = new Date(date);
// //       formattedDate.setUTCHours(0, 0, 0, 0);

// //       const operations = slots.map(slot => ({
// //         updateOne: {
// //           filter: { date: formattedDate, slot },
// //           update: { $set: { isBlocked: true } },
// //           upsert: true
// //         }
// //       }));
// //       console.log("operation",operations[0]);

// //       await TimeSlot.bulkWrite(operations);

// //       res.status(200).json(new ApiResponse(200, {}, "Time slots blocked successfully"));
// //     } catch (error) {
// //       next(error);
// //     }
// //   });
// // const blockTimeSlots = asyncHandler(async (req, res, next) => {
// //     try {
// //       const { date, slots } = req.body;

// //       if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
// //         throw new ApiError(400, "Invalid input. Date and non-empty slots array are required.");
// //       }

// //       const formattedDate = new Date(date);
// //       formattedDate.setUTCHours(0, 0, 0, 0);

// //       const results = await Promise.all(slots.map(async (slot) => {
// //         // Check if the slot exists and is not already blocked or booked
// //         const existingSlot = await TimeSlot.findOne({
// //           date: formattedDate,
// //           slot: slot
// //         });

// //         if (existingSlot) {
// //           if (existingSlot.isBlocked) {
// //             return { slot, status: 'already_blocked' };
// //           }
// //           if (existingSlot.bookedBy) {
// //             return { slot, status: 'already_booked' };
// //           }
// //           // Update existing slot
// //           existingSlot.isBlocked = true;
// //           await existingSlot.save();
// //           return { slot, status: 'blocked' };
// //         } else {
// //           // Create new slot
// //           await TimeSlot.create({
// //             date: formattedDate,
// //             slot: slot,
// //             isBlocked: true
// //           });
// //           return { slot, status: 'blocked' };
// //         }
// //       }));

// //       const summary = results.reduce((acc, result) => {
// //         acc[result.status] = (acc[result.status] || 0) + 1;
// //         return acc;
// //       }, {});

// //       res.status(200).json(new ApiResponse(200, { results, summary }, "Time slots processed successfully"));
// //     } catch (error) {
// //       next(error);
// //     }
// //   });
//   const unblockTimeSlots = asyncHandler(async (req, res, next) => {
//     try {
//       const { date, slots } = req.body;

//       if (!date || !slots || !Array.isArray(slots)) {
//         throw new ApiError(400, "Invalid input. Date and slots array are required.");
//       }

//       const formattedDate = new Date(date);
//       formattedDate.setUTCHours(0, 0, 0, 0);

//       await TimeSlot.updateMany(
//         { date: formattedDate, slot: { $in: slots } },
//         { $set: { isBlocked: false } }
//       );

//       res.status(200).json(new ApiResponse(200, {}, "Time slots unblocked successfully"));
//     } catch (error) {
//       next(error);
//     }
//   });

//   const getAvailableTimeSlots = asyncHandler(async (req, res, next) => {
//     try {
//       const { date } = req.query;

//       if (!date) {
//         throw new ApiError(400, "Date is required.");
//       }

//       const formattedDate = new Date(date);
//       formattedDate.setUTCHours(0, 0, 0, 0);

//       const allSlots = [
//         "9:00-9:45 AM", "9:45-10:30 AM", "10:30-11:15 AM",
//         "11:15-12:00 PM", "12:00-12:45 PM", "12:45-1:30 PM",
//         "1:30-2:15 PM", "2:15-3:00 PM"
//       ];

//       const blockedOrBookedSlots = await TimeSlot.find({
//         date: formattedDate,
//         $or: [{ isBlocked: true }, { bookedBy: { $exists: true } }]
//       }).lean();

//       const blockedSlots = new Set(blockedOrBookedSlots.map(slot => slot.slot));

//       // Check if "AM", "PM", or "ALL" are blocked
//       if (blockedSlots.has("ALL")) {
//         return res.json(new ApiResponse(200, { availableSlots: [] }, "No slots available"));
//       }

//       const availableSlots = allSlots.filter(slot => {
//         if (blockedSlots.has("AM") && slot.includes("AM")) return false;
//         if (blockedSlots.has("PM") && slot.includes("PM")) return false;
//         return !blockedSlots.has(slot);
//       });

//       res.json(new ApiResponse(200, { availableSlots }, "Available slots retrieved successfully"));
//     } catch (error) {
//       next(error);
//     }
//   });

//   export{blockTimeSlots,unblockTimeSlots}
