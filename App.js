// Import React
import React, { useState, useRef } from "react";
// Import required components
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  PermissionsAndroid
} from "react-native";

import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import Canvas, { Image as ImageCanvas, } from "react-native-canvas";
import axios from "axios";
const App = () => {
  const [base64, setBase64] = useState("");
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [predictions, setPredictions] = useState([]);

  const canvasRef = useRef(null);

  const chooseFile = (type) => {
    let options = {
      mediaType: type,
      quality: 1,
      includeBase64: true,
      maxWidth: 1280,
      maxHeight: 720,
    };
    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        alert("User cancelled camera picker");
        return;
      } else if (response.errorCode == "camera_unavailable") {
        alert("Camera not available on device");
        return;
      } else if (response.errorCode == "permission") {
        alert("Permission not satisfied");
        return;
      } else if (response.errorCode == "others") {
        alert(response.errorMessage);
        return;
      }
      setBase64(`data:image/jpeg;base64,${response.assets[0].base64}`);
      setHeight(response.assets[0].height);
      setWidth(response.assets[0].width);
      updateImage(response)

    });
  };
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs camera permission',
          },
        );
        // If CAMERA Permission is granted
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else return true;
  };

  const requestExternalWritePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'External Storage Write Permission',
            message: 'App needs write permission',
          },
        );
        // If WRITE_EXTERNAL_STORAGE Permission is granted
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        alert('Write permission err', err);
      }
      return false;
    } else return true;
  };

  const captureImage = async (type) => {
    let options = {
      mediaType: type,
      quality: 1,
      maxWidth: 1280,
      maxHeight: 720,
      includeBase64: true,
      saveToPhotos: true,
    };
    let isCameraPermitted = await requestCameraPermission();
    let isStoragePermitted = await requestExternalWritePermission();
    if (isCameraPermitted && isStoragePermitted) {
      launchCamera(options, (response) => {
        if (response.didCancel) {
          alert('User cancelled camera picker');
          return;
        } else if (response.errorCode == 'camera_unavailable') {
          alert('Camera not available on device');
          return;
        } else if (response.errorCode == 'permission') {
          alert('Permission not satisfied');
          return;
        } else if (response.errorCode == 'others') {
          alert(response.errorMessage);
          return;
        }
        console.log('responeABC', response);

        setBase64(`data:image/jpeg;base64,${response.assets[0].base64}`);
        setHeight(response.assets[0].height);
        setWidth(response.assets[0].width);
        updateImage(response)
      });
    }
  };

  const updateImage = (response) => {
    const formData = new FormData();
    formData.append("photo", {
      uri: Platform.OS === "android" ? response.assets[0].uri : response.assets[0].uri.replace("file://", ""),
      type: response.assets[0].type,
      name: response.assets[0].fileName
    });

    axios
      .post("http://10.1.41.53:3000/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((resp) => setPredictions(resp.data.predictions))
      .catch((error) => console.error(error));
  }

  React.useEffect(() => {
    if (!base64 || !width || !height) {
      return;
    }
    const canvasObj = canvasRef.current;
    const ctx = canvasObj.getContext("2d");
    canvasObj.width = width;
    canvasObj.height = height;
    const img = new ImageCanvas(canvasObj);

    img.addEventListener("load", () => {
      ctx.drawImage(img, 0, 0, width, height);
      if (predictions.length > 0) {
        for (const prediction of predictions) {
          if (prediction.probabilities > 0.5) {
            ctx.fillStyle = "blue";
            ctx.strokeStyle = "red";
            const bboxLeft = prediction.box[0] * width;
            const bboxTop = prediction.box[1] * height;
            const bboxWidth = prediction.box[2] * width; - bboxLeft;
            const bboxHeight = prediction.box[3] * height - bboxTop;
            ctx.rect(bboxLeft, bboxTop, bboxWidth, bboxHeight);
            ctx.font = "28px Arial";
            ctx.fillStyle = "red";
            ctx.fillText(prediction.label + ": " + Math.round(parseFloat(prediction.probabilities) * 100) + "%", bboxLeft, bboxTop);
            ctx.stroke();
          }
        }
      }
    });
    img.src = base64;
  }, [predictions]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Canvas ref={canvasRef} />
        <TouchableOpacity
          activeOpacity={0.5}
          style={styles.buttonStyle}
          onPress={() => chooseFile("photo")}
        >
          <Text style={styles.textStyle}>Choose Image</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.5}
          style={styles.buttonStyle}
          onPress={() => captureImage("photo")}
        >
          <Text style={styles.textStyle}>captureImage</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  titleText: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 20,
  },
  textStyle: {
    padding: 10,
    color: "black",
    textAlign: "center",
  },
  buttonStyle: {
    alignItems: "center",
    backgroundColor: "#DDDDDD",
    padding: 5,
    marginVertical: 10,
    width: 250,
  },
  imageStyle: {
    width: 200,
    height: 200,
    margin: 5,
  },
});
