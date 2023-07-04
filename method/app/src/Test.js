import React, { useState } from "react";
import {
  EuiProvider,
  EuiFilePicker,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToast,
} from "@elastic/eui";
import "./App.css";

const API_GATEWAY_URL = process.env.REACT_APP_API_GATEWAY_URL;

function Test() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileValidationMessage, setFileValidationMessage] = useState(null);

  const handleFileChange = (files) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setFileValidationMessage(null);
    }
  };

  const uploadFile = async () => {
    try {
      const presignedUrl = await getPresignedUrl();
      if (presignedUrl) {
        await sendFileToPresignedUrl(presignedUrl);
      }
    } catch (error) {
      console.error("Error:", error);
      setUploadError("An error occurred during the upload");
    } finally {
      setUploading(false);
    }
  };

  const getPresignedUrl = async () => {
    try {
      const presignedUrlResponse = await fetch(`${API_GATEWAY_URL}`, {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      if (presignedUrlResponse.ok) {
        const data = await presignedUrlResponse.json();
        return data.uploadUrl;
      } else {
        setUploadError("Error getting presigned URL");
      }
    } catch (error) {
      throw new Error("Error getting presigned URL");
    }
  };

  const sendFileToPresignedUrl = async (uploadUrl) => {
    try {
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      if (uploadResponse.ok) {
        setUploadSuccess(true);
      } else {
        setUploadError("Error uploading file to S3");
      }
    } catch (error) {
      throw new Error("Error uploading file to S3");
    }
  };

  const handleUpload = async () => {
    if (selectedFile) {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(false);
      await uploadFile();
    } else {
      setFileValidationMessage("Please select a file to upload");
    }
  };

  return (
    <EuiProvider>
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        style={{ height: "100vh" }}
      >
        <EuiFlexItem grow={false}>
          <EuiPanel paddingSize="l">
            <EuiFilePicker
              id="filePicker"
              onChange={(files) => handleFileChange(files)}
              display="default"
              fullWidth
            />
            {fileValidationMessage && (
              <EuiText color="danger">{fileValidationMessage}</EuiText>
            )}
            <EuiSpacer />
            <EuiButton
              onClick={handleUpload}
              color="primary"
              fill
              fullWidth
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </EuiButton>
            {uploadError && (
              <>
                <EuiSpacer />
                <EuiText color="danger">{uploadError}</EuiText>
              </>
            )}
            {uploadSuccess && (
              <EuiSpacer>
                <EuiToast
                  title="Success"
                  color="success"
                  iconType="check"
                  onClose={() => setUploadSuccess(false)}
                >
                  <p>File uploaded successfully to S3</p>
                </EuiToast>
              </EuiSpacer>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiProvider>
  );
}

export default Test;
