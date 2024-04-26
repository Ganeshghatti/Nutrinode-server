import React from 'react'
import Spinner from "react-native-loading-spinner-overlay";

export default function firebase() {
  const [loading,setLoading]=useState(false);

  try{
    setLoading(true);

  }finally{
    setLoading(false);

  }

  return (
    <div>
            <Spinner
        visible={loading}
        textContent={"Loading..."}
        textStyle={styles.spinnerText}
      />
    </div>
  )
}
