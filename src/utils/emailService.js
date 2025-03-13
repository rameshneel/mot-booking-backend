// src/utils/email.service.js
import { config } from "dotenv";
import nodemailer from "nodemailer";
// Load environment variables
config();
// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};
const transporter = nodemailer.createTransport(emailConfig);
// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP connection error:", error);
  } else {
    console.log("SMTP connection is ready");
  }
});

// Send email function
const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: "Booking <ramesh@neelnetworks.com>",
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

// Helper functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const sendCustomerConfirmationEmail = async (
  customer,
  bookingDetails
) => {
  const {
    selectedDate,
    selectedTimeSlot,
    totalPrice,
    serviceDescription,
    howDidYouHearAboutUs,
    paymentMethod,
    paymentStatus,
  } = bookingDetails;

  const emailSubject = "Your Booking is Confirmed!";
  const emailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #232e35; margin: 0; padding: 0; background-color: #01669A; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #232e35; color: #ffffff; padding: 20px; text-align: center; }
        .content { background-color: #ffffff; padding: 20px; border-radius: 5px; }
        .booking-details { background-color: #f0f0f0; border: 1px solid #e0e0e0; border-radius: 5px; padding: 15px; margin-top: 20px; }
        .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
        .btn { display: inline-block; padding: 10px 20px; background-color: #3B82F6; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 500; transition: background-color 0.3s; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Booking is Confirmed!</h1> 
        </div>
        <div class="content">
          <p>Dear ${customer.customerName},</p>
          <p>Thank you for choosing our service. We're delighted to confirm your appointment.</p>
          
          <div class="booking-details">
            <h2>Booking Details</h2>
            <p><strong>Date:</strong> ${formatDate(selectedDate)}</p>
            <p><strong>Time:</strong> ${selectedTimeSlot}</p>
            <p><strong>Service:</strong> ${serviceDescription}</p>
            <p><strong>Amount Paid:</strong> ${formatCurrency(totalPrice)}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p><strong>Payment Status:</strong> ${paymentStatus}</p>
          </div>
          
          <p>We're looking forward to serving you. If you need to make any changes, please contact us at least 24 hours before your appointment.</p>
          
          <p>For any questions or assistance, please don't hesitate to reach out to us:</p>
          <p>
            <a href="mailto:${
              process.env.COMPANY_EMAIL
            }" class="btn">Email Us</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${
    process.env.COMPANY_NAME
  }. All rights reserved.</p>
          <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(customer.email, emailSubject, emailBody);
};

// Admin notification email
export const sendAdminNotificationEmail = async (
  customer,
  bookingDetails,
  captureDetails
) => {
  const { selectedDate, selectedTimeSlot, totalPrice, serviceDescription } =
    bookingDetails;
  const { id: orderID, status, purchase_units } = captureDetails;

  const emailSubject = "New Booking Alert: Customer Appointment Confirmed";

  const emailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Booking Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #232e35; margin: 0; padding: 0; background-color: #01669A; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #232e35; color: #ffffff; padding: 20px; text-align: center; }
        .content { background-color: #ffffff; padding: 20px; border-radius: 5px; }
        .section { margin-bottom: 20px; }
        .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Booking Notification</h1>
        </div>
        <div class="content">
          <div class="section">
            <h2>Customer Information</h2>
            <table>
              <tr><th>Name</th><td>${customer.customerName}</td></tr>
              <tr><th>Email</th><td>${customer.email}</td></tr>
              <tr><th>Phone</th><td>${customer.contactNumber || "N/A"}</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>Booking Details</h2>
            <table>
              <tr><th>Date</th><td>${formatDate(selectedDate)}</td></tr>
              <tr><th>Time</th><td>${selectedTimeSlot}</td></tr>
              <tr><th>Service</th><td> ${serviceDescription}</td></tr>
              <tr><th>Amount Paid</th><td>${formatCurrency(
                totalPrice
              )}</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>Payment Information</h2>
            <table>
              <tr><th>Order ID</th><td>${orderID}</td></tr>
              <tr><th>Status</th><td>${status}</td></tr>
              <tr><th>Payment Method</th><td>${customer.paymentMethod}</td></tr>
            </table>
          </div>
          
          <p>Please ensure all necessary preparations are made for this appointment.</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from your Booking System.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(process.env.ADMIN_EMAIL, emailSubject, emailBody);
};

// Customer Confirmation Email (for MOT test online booking)
export const sendCustomerConfirmationEmailOnline = async (customer) => {
  const emailSubject = "Your MOT Test Booking Confirmation - Slot Reserved";
  const emailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOT Test Booking Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #232e35; margin: 0; padding: 0; background-color: #01669A; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #232e35; color: #ffffff; padding: 20px; text-align: center; }
        .content { background-color: #ffffff; padding: 20px; border-radius: 5px; }
        .booking-details { background-color: #f0f0f0; border: 1px solid #e0e0e0; border-radius: 5px; padding: 15px; margin-top: 20px; }
        .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
        .btn { display: inline-block; padding: 10px 20px; background-color: rgb(0, 1, 2); color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 500; }
        .note { color: #D97706; font-style: italic; margin-top: 15px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your MOT Test Slot is Reserved!</h1>
        </div>
        <div class="content">
          <p>Dear ${customer.firstName} ${customer.lastName},</p>
          <p>Thank you for scheduling your MOT test with us online! Your slot has been successfully reserved.</p>
          
          <div class="booking-details">
            <h2>MOT Test Details</h2>
            <p><strong>Booking ID:</strong> ${customer.paypalOrderId}</p>
            <p><strong>Date:</strong> ${formatDate(customer.selectedDate)}</p>
            <p><strong>Time:</strong> ${customer.selectedTimeSlot}</p>
            <p><strong>Vehicle:</strong> ${customer.makeAndModel} (${
    customer.registrationNo
  })</p>
            <p><strong>Amount Due:</strong> ${formatCurrency(
              customer.totalPrice
            )}</p>
            <p><strong>Payment Method:</strong> Cash </p>
            <p><strong>Payment Status:</strong> Pending</p>
            <p><strong>Booked By:</strong> You (Online MOT Booking)</p>
          </div>
          
          <p class="note">Important: Please bring cash or card for payment on the day of your MOT test.</p>
          
          <p>To reschedule your MOT test or for any questions, please contact us:</p>
          <p>
            <a href="mailto:${
              process.env.COMPANY_EMAIL
            }" class="btn">Contact Us</a>
            <span> or call ${process.env.COMPANY_PHONE}</span>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${
    process.env.COMPANY_NAME
  }. All rights reserved.</p>
          <p>MOT Booking created on: ${formatDate(customer.createdAt)}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(customer.email, emailSubject, emailBody);
};

// Admin Notification Email (for MOT test online booking)
export const sendAdminNotificationEmailOnline = async (customer) => {
  const emailSubject = "New Online MOT Booking Alert: Slot Reserved";

  const emailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOT Booking Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #232e35; margin: 0; padding: 0; background-color: #01669A; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #232e35; color: #ffffff; padding: 20px; text-align: center; }
        .content { background-color: #ffffff; padding: 20px; border-radius: 5px; }
        .section { margin-bottom: 20px; }
        .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .alert { color: #D97706; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Online MOT Booking Notification</h1>
        </div>
        <div class="content">
          <p class="alert">New MOT test slot reserved through Online Booking System</p>
          
          <div class="section">
            <h2>Customer Information</h2>
            <table>
              <tr><th>Name</th><td>${customer.firstName} ${
    customer.lastName
  }</td></tr>
              <tr><th>Email</th><td>${customer.email}</td></tr>
              <tr><th>Phone</th><td>${customer.contactNumber || "N/A"}</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>MOT Test Details</h2>
            <table>
              <tr><th>Booking ID</th><td>${customer.paypalOrderId}</td></tr>
              <tr><th>Date</th><td>${formatDate(
                customer.selectedDate
              )}</td></tr>
              <tr><th>Time</th><td>${customer.selectedTimeSlot}</td></tr>
              <tr><th>Vehicle</th><td>${customer.makeAndModel} (${
    customer.registrationNo
  })</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>Payment Information</h2>
            <table>
              <tr><th>Amount Due</th><td>${formatCurrency(
                customer.totalPrice
              )}</td></tr>
              <tr><th>Method</th><td>Payment on the Day</td></tr>
            </table>
          </div>
          
          <p>MOT Booking created by: Customer (Online) on ${formatDate(
            customer.createdAt
          )}</p>
        </div>
        <div class="footer">
          <p>Automated notification from MOT Online Booking System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(process.env.ADMIN_EMAIL, emailSubject, emailBody);
};

export const sendCustomerRefundEmail = async (customer, refundDetails) => {
  const emailSubject = "Your Refund Has Been Processed";
  const emailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Refund Notification</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #FF0000;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #FF0000;
          color: #ffffff;
          padding: 20px;
          text-align: center;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        .content {
          padding: 20px;
        }
        .booking-details {
          background-color: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 5px;
          padding: 15px;
          margin-top: 20px;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #888;
          text-align: center;
        }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background-color: #FF0000;
          color: #ffffff;
          text-decoration: none;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Refund Has Been Processed</h1>
        </div>
        <div class="content">
          <p>Dear ${customer.customerName},</p>
          <p>We're writing to inform you that your recent payment has been refunded.</p>
          <p>Refund Details:</p>
          <ul>
            <li>Refund ID: ${refundDetails.id}</li>
            <li>Refund Amount: ${formatCurrency(customer.refundAmount)}</li>
            <li>Refund Status: ${refundDetails.status}</li>
          </ul>
          <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
          <p>Best regards,<br>
          ${process.env.COMPANY_NAME}</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${
    process.env.COMPANY_NAME
  }. All rights reserved.</p>
          <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(customer.email, emailSubject, emailBody);
};
export const sendAdminRefundNotificationEmail = async (
  customer,
  refundDetails
) => {
  const emailSubject = "New Refund Notification";
  const emailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Refund Notification</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #FF0000;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #FF0000;
          color: #ffffff;
          padding: 20px;
          text-align: center;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        .content {
          padding: 20px;
        }
        .section {
          margin-bottom: 20px;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #888;
          text-align: center;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f2f2f2;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Refund Notification</h1>
        </div>
        <div class="content">
          <p>Dear Admin,</p>
          <p>A refund has been processed for the following customer:</p>
          <ul>
            <li>Customer Name: ${customer.customerName}</li>
            <li>Customer Email: ${customer.email}</li>
            <li>Refund ID: ${refundDetails.id}</li>
            <li>Refund Amount: ${formatCurrency(customer.refundAmount)}</li>
            <li>Refund Status: ${refundDetails.status}</li>
            <li>Refund Reason: ${customer.refundReason}</li>
          </ul>
          <p>Please review the refund details and take any necessary actions.</p>
          <p>Best regards,<br>
          ${process.env.COMPANY_NAME}</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${
    process.env.COMPANY_NAME
  }. All rights reserved.</p>
          <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(process.env.ADMIN_EMAIL, emailSubject, emailBody);
};
