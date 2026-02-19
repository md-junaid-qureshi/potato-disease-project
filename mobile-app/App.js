import React, {useState} from 'react';
import {
  SafeAreaView,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  Platform,
  Dimensions,
  useColorScheme,
  View,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import axios from 'axios';
// import Config from 'react-native-config'; // Isse hata diya hai confusion rokne ke liye
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import PermissionsService, {isIOS} from './Permissions';

// --- FIXED URL ---
// Maine yahan direct aapka IP daal diya hai
// const FINAL_API_URL = "http://10.38.79.208:8000/predict";
// const FINAL_API_URL = "https://potato-disease-api-wd08.onrender.com/predict";      #ye Direct Bypass tha esko comment karke mene .env me dal dia hai
const FINAL_API_URL = Config.URL || "https://potato-disease-api-wd08.onrender.com/predict";
axios.interceptors.request.use(
  async config => {
    let request = config;
    request.headers = {
      'Content-Type': 'multipart/form-data', // Image ke liye ye zaroori hai
      Accept: 'application/json',
    };
    return request;
  },
  error => error,
);

export const {height, width} = Dimensions.get('window');

export const fonts = {
  Bold: {fontFamily: 'Roboto-Bold'},
};

const options = {
  mediaType: 'photo',
  quality: 1,
  width: 256,
  height: 256,
  includeBase64: true,
};

const App = () => {
  const [result, setResult] = useState('');
  const [label, setLabel] = useState('');
  const isDarkMode = useColorScheme() === 'dark';
  const [image, setImage] = useState('');
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const getPredication = async params => {
    return new Promise((resolve, reject) => {
      var bodyFormData = new FormData();
      // Backend ko 'file' naam se data chahiye
      bodyFormData.append('file', {
        uri: params.uri,
        name: params.name || 'photo.jpg',
        type: params.type || 'image/jpeg',
      });

      console.log("Sending request to:", FINAL_API_URL);

      return axios({
        method: 'post',
        url: FINAL_API_URL,
        data: bodyFormData,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(response => {
        console.log("Response received:", response.data);
        resolve(response);
      })
      .catch(error => {
        console.log("Axios Error Details:", error.message);
        setLabel('Failed to predicting.');
        reject(error);
      });
    });
  };

  const manageCamera = async type => {
    try {
      if (!(await PermissionsService.hasCameraPermission())) {
        return [];
      } else {
        if (type === 'Camera') {
          openCamera();
        } else {
          openLibrary();
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const openCamera = async () => {
    launchCamera(options, async response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        const uri = response?.assets[0]?.uri;
        const path = Platform.OS !== 'ios' ? uri : 'file://' + uri;
        getResult(path, response);
      }
    });
  };

  const clearOutput = () => {
    setResult('');
    setImage('');
    setLabel('');
  };

  const getResult = async (path, response) => {
    setImage(path);
    setLabel('Predicting...');
    setResult('');
    const params = {
      uri: path,
      name: response.assets[0].fileName,
      type: response.assets[0].type,
    };
    try {
        const res = await getPredication(params);
        if (res?.data?.class) {
          setLabel(res.data.class);
          setResult(res.data.confidence); // Agar backend decimal bhej raha hai toh 100 se multiply
        } else {
          setLabel('Failed to predict');
        }
    } catch (e) {
        setLabel('Failed to predicting.');
    }
  };

  const openLibrary = async () => {
    launchImageLibrary(options, async response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        const uri = response.assets[0].uri;
        const path = Platform.OS !== 'ios' ? uri : 'file://' + uri;
        getResult(path, response);
      }
    });
  };

  return (
    <View style={[backgroundStyle, styles.outer]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ImageBackground
        blurRadius={10}
        source={{uri: 'background'}}
        style={{height: height, width: width, position: 'absolute'}}
      />
      <Text style={styles.title}>{'Potato Disease \nPrediction App'}</Text>
      <TouchableOpacity onPress={clearOutput} style={styles.clearStyle}>
        <Image source={{uri: 'clean'}} style={styles.clearImage} />
      </TouchableOpacity>
      
      {(image?.length > 0 && (
        <Image source={{uri: image}} style={styles.imageStyle} />
      )) || null}

      {(result && label && label !== 'Predicting...' && label !== 'Failed to predicting.' && (
        <View style={styles.mainOuter}>
          <Text style={[styles.space, styles.labelText]}>
            {'Label: \n'}
            <Text style={styles.resultText}>{label}</Text>
          </Text>
          <Text style={[styles.space, styles.labelText]}>
            {'Confidence: \n'}
            <Text style={styles.resultText}>
              {parseFloat(result).toFixed(2) + '%'}
            </Text>
          </Text>
        </View>
      )) || (image && <Text style={styles.emptyText}>{label}</Text>) || (
          <Text style={styles.emptyText}>
            Use below buttons to select a picture of a potato plant leaf.
          </Text>
        )}

      <View style={styles.btn}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => manageCamera('Camera')}
          style={styles.btnStyle}>
          <Image source={{uri: 'camera'}} style={styles.imageIcon} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => manageCamera('Photo')}
          style={styles.btnStyle}>
          <Image source={{uri: 'gallery'}} style={styles.imageIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    alignSelf: 'center',
    position: 'absolute',
    top: (isIOS && 35) || 10,
    fontSize: 30,
    ...fonts.Bold,
    color: '#FFF',
    textAlign: 'center',
    zIndex: 10,
  },
  clearImage: {height: 40, width: 40, tintColor: '#FFF'},
  mainOuter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    top: height / 1.6,
    alignSelf: 'center',
    width: '90%',
  },
  outer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    position: 'absolute',
    bottom: 40,
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  btnStyle: {
    backgroundColor: '#FFF',
    opacity: 0.8,
    marginHorizontal: 30,
    padding: 20,
    borderRadius: 20,
  },
  imageStyle: {
    marginBottom: 50,
    width: width / 1.5,
    height: width / 1.5,
    borderRadius: 20,
    position: 'absolute',
    borderWidth: 0.3,
    borderColor: '#FFF',
    top: height / 4.5,
  },
  clearStyle: {
    position: 'absolute',
    top: 100,
    right: 30,
    zIndex: 10,
  },
  space: {marginVertical: 10, marginHorizontal: 10},
  labelText: {color: '#FFF', fontSize: 18, ...fonts.Bold},
  resultText: {fontSize: 28, ...fonts.Bold, color: '#FFF'},
  imageIcon: {height: 40, width: 40, tintColor: '#000'},
  emptyText: {
    position: 'absolute',
    top: height / 1.6,
    alignSelf: 'center',
    color: '#FFF',
    fontSize: 20,
    textAlign: 'center',
    maxWidth: '80%',
    ...fonts.Bold,
  },
});

export default App;