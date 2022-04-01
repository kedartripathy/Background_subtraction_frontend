import './App.css';
import React from 'react';

// global variables to change where necessary
const DROPDOWN_API_ENDPOINT = 'https://4ickwx7p05.execute-api.us-east-1.amazonaws.com/prod/'; // TODO
const ML_API_ENDPOINT = 'https://l19uqhtky0.execute-api.us-east-1.amazonaws.com/prod/'; // TODO


// atob is deprecated but this function converts base64string to text string
const decodeFileBase64 = (base64String) => {
  // From Bytestream to Percent-encoding to Original string

  return "data:image/png;base64," + base64String

//  return decodeURIComponent(
//    atob(base64String).split("").map(function (c) {
//      return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
//    }).join("")
//  );
};


function App() {
  const [inputFileData, setInputFileData] = React.useState(''); // represented as bytes data (string)
  const [outputFileData, setOutputFileData] = React.useState(''); // represented as readable data (text string)
  const [ModeloutputFileData, setModelOutputFileData] = React.useState('');
  const [inputImage, setInputImage] = React.useState(''); // represented as bytes data (string)
  const [buttonDisable, setButtonDisable] = React.useState(true);
  const [submitButtonText, setSubmitButtonText] = React.useState('Submit');
  const [fileButtonText, setFileButtonText] = React.useState('Upload File');
  const [demoDropdownFiles, setDemoDropdownFiles] = React.useState([]);
  const [selectedDropdownFile, setSelectedDropdownFile] = React.useState('');

  // make GET request to get demo files on load -- takes a second to load
  React.useEffect(() => {
    fetch(DROPDOWN_API_ENDPOINT)
    .then(response => response.json())
    .then(data => {
      // GET request error
      if (data.statusCode === 400) {
        console.log('Sorry! There was an error, the demo files are currently unavailable.')
      }

      // GET request success
      else {
        const s3BucketFiles = JSON.parse(data.body);
        setDemoDropdownFiles(s3BucketFiles["s3Files"]);
      }
    });
  }, [])


  // convert file to bytes data
  const convertFileToBytes = (inputFile) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(inputFile); // reads file as bytes data

      fileReader.onload = () => {
        resolve(fileReader.result);
      };

      fileReader.onerror = (error) => {
        reject(error);
      };
    });
  }


  // handle file input
  const handleChange = async (event) => {
    const inputFile = event.target.files[0];

    // update file button text
    setFileButtonText(inputFile.name);

    // convert file to bytes data
    const base64Data = await convertFileToBytes(inputFile);
    setInputImage(base64Data);
    const base64DataArray = base64Data.split('base64,'); // need to get rid of 'data:image/png;base64,' at the beginning of encoded string
    const encodedString = base64DataArray[1];
    setInputFileData(encodedString);

    // enable submit button
    setButtonDisable(false);

    // clear response results
    setOutputFileData('');

    // reset demo dropdown selection
    setSelectedDropdownFile('');
  }


  // handle file submission
  const handleSubmit = (event) => {
    event.preventDefault();

    // temporarily disable submit button
    setButtonDisable(true);
    setSubmitButtonText('Loading Result...');

    // make POST request
    console.log('making POST request...');
    fetch(ML_API_ENDPOINT, {
      method: 'POST',
      headers: { "Content-Type": "application/json", "Accept": "image/png" },
      body: JSON.stringify({ "image": inputFileData })
    }).then(response => response.json())
    .then(data => {
      console.log('getting response...')
      console.log(data);

      // POST request error
      if (data.statusCode === 400) {
        const outputErrorMessage = JSON.parse(data.errorMessage)['outputResultsData'];
        setOutputFileData(outputErrorMessage);
      }

      // POST request success
      else {
        const outputBytesData = JSON.parse(data.body)['outputResultsData'];
        setOutputFileData(decodeFileBase64(outputBytesData));
        const modeloutputBytesData = JSON.parse(data.body)['modeloutputResultsData'];
        setModelOutputFileData(decodeFileBase64(modeloutputBytesData));
      }

      // re-enable submit button
      setButtonDisable(false);
      setSubmitButtonText('Submit');
    })
    .then(() => {
      console.log('POST request success');
    })
  }


  // handle demo dropdown file selection
  const handleDropdown = (event) => {
    setSelectedDropdownFile(event.target.value);

    // temporarily disable submit button
    setButtonDisable(true);
    setSubmitButtonText('Loading Demo File...');

    // only make POST request on file selection
    if (event.target.value) {
      fetch(DROPDOWN_API_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ "fileName": event.target.value })
      }).then(response => response.json())
      .then(data => {

        // POST request error
        if (data.statusCode === 400) {
          console.log('Uh oh! There was an error retrieving the dropdown file from the S3 bucket.')
        }

        // POST request success
        else {
          const dropdownFileBytesData = JSON.parse(data.body)['bytesData'];
          setInputFileData(dropdownFileBytesData);
          setInputImage('data:image/png;base64,' + dropdownFileBytesData); // hacky way of setting image from bytes data - even works on .jpeg lol
          setSubmitButtonText('Submit');
          setButtonDisable(false);
        }
      });
    }

    else {
      setInputFileData('');
    }
  }


  return (
    <div className="App">
      <div className="Header">
        <h1>Image Background Subtraction using a Machine Learning Model</h1>
        <h2>By: Kedar Tripathy</h2>
        <a href="https://www.kedartripathy.com/" target="_blank" rel="external" hreflang="en" type="text/html">My Website</a>
        <p>This web app uses a Machine Learning model to return your profile picture with the background subtracted</p>
      </div>

      <div className="Input">
          <h2>Image Upload</h2>
          <label htmlFor="demo-dropdown">Choose a demo image: </label>
          <select name="Select Image" id="demo-dropdown" value={selectedDropdownFile} onChange={handleDropdown}>
              <option value="">-- Select Demo File --</option>
              {demoDropdownFiles.map((file) => <option key={file} value={file}>{file}</option>)}
          </select>
          <p>Or upload your own (max 3MB):</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="file-upload">{fileButtonText}</label>
            <input type="file" id="file-upload" onChange={handleChange} />
           <button type="submit" disabled={buttonDisable}>{submitButtonText}</button>
          </form>
      </div>

      <div className='Content'>
        <div className="Output">
          <h2>Input Image</h2>
          <p>  </p>
          <img src={inputImage} alt="" />
        </div>

        <div className="Output">
          <h2>Model Output</h2>
          <p>Black: Background, White: Foreground</p>
          <img src={ModeloutputFileData} alt="" />
        </div>

        <div className="Output">
          <h2>Results</h2>
          <p>  </p>
          <img src={outputFileData} alt="" />
        </div>

      </div>
    </div>
  );
}

export default App;