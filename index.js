const express = require("express");
const pdfPrinter = require("pdf-to-printer");
const fs = require("fs");
const os = require("os");
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
const port = 3001;
const cors = require("cors");

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/print-receipt", (req, res) => {
  const { pdfData, printer } = req.body;

  if (!pdfData) {
    return res.status(400).send("No PDF data provided");
  }

  const pdfBuffer = Buffer.from(pdfData, "base64");

  const tempFilePath = path.join(os.tmpdir(), "receipt.pdf");

  fs.writeFile(tempFilePath, pdfBuffer, (err) => {
    if (err) {
      console.error("Error writing to temporary file", err);
      return res.status(500).send("Error saving PDF file");
    }

    pdfPrinter
      .print(tempFilePath, { printer })
      .then(() => {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error("Error deleting temp file", err);
        });

        res.status(200).json({
            success: true,
            message: "Receipt printed successfully!",
        });
      })
      .catch((error) => {
        console.error("Error printing receipt", error);
        res.status(500).json({
            success: false,
            message: "Error printing receipt.",
        });
      });
  });
});

app.get("/printers", async (req, res) => {
    const { exec } = require("child_process");

    // Run WMIC or PowerShell to get the printer names and their statuses
    exec('wmic printer get name,status', (err, stdout, stderr) => {
        if (err) {
            console.error("Error executing wmic command", err);
            return res.status(500).json({ success: false, message: "Failed to get printers." });
        }

        console.log("Raw WMIC Output:", stdout); // Log the raw output to see what we're working with

        // Step 1: Clean the output by removing unwanted carriage returns and extra spaces
        let lines = stdout.split("\n")
            .map(line => line.replace(/\r/g, '').trim()) // Remove \r and trim each line
            .filter(line => line.length > 0); // Remove empty lines

        console.log("Cleaned Lines:", lines); // Log cleaned lines

        // Step 2: Extract headers and data lines
        const header = lines[0].split(/\s{2,}/).filter(Boolean); // Split by 2 or more spaces and remove empty entries
        console.log("Header:", header); // Check the headers array

        const nameIndex = header.indexOf('Name');
        const statusIndex = header.indexOf('Status');
        console.log(`nameIndex: ${nameIndex}, statusIndex: ${statusIndex}`);

        // Step 3: Parse the printer data
        let printers = [];

        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(/\s{2,}/).filter(Boolean); // Split by 2 or more spaces
            console.log("Parsed Line:", parts); // Log the parsed line to inspect

            if (parts.length >= 2) {  // Ensure there are at least 2 elements: Name and Status
                const printerName = parts[0]; // First part is the printer name
                let status = parts[1] || 'Unknown'; // Default to 'Unknown' if no status is found

                // Map technical status to more readable versions
                switch (status.trim()) {
                    case 'Offline':
                        status = { message: 'Printer is offline', icon: 'offline' };
                        break;
                    case 'Idle':
                        status = { message: 'Printer is idle', icon: 'idle' };
                        break;
                    case 'Printing':
                        status = { message: 'Printer is printing', icon: 'printing' };
                        break;
                    case 'Error':
                        status = { message: 'Printer is in error state', icon: 'error' };
                        break;
                    case 'Degraded':
                        status = { message: 'Printer has reduced functionality', icon: 'degraded' };
                        break;
                    case 'Unknown':
                        status = { message: 'Printer status is unknown', icon: 'unknown' };
                        break;
                    default:
                        status = { message: `Printer status: ${status.trim()}`, icon: 'unknown' };
                }

                printers.push({
                    name: printerName,
                    status: status
                });
            }
        }

        console.log("Final Printer Data:", printers); // Log the final array of printers

        // Step 4: Return the parsed data to the client
        res.json({ printers });
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
