import Spinner from "react-native-loading-spinner-overlay";
const [loading,setLoading]=useState(false);

  try{
    setLoading(true);

  }finally{
    setLoading(false);

  }

            <Spinner
        visible={loading}
        textContent={"Loading..."}
        textStyle={styles.spinnerText}
      />

      const styles = StyleSheet.create({
        spinnerText: {
          color: "#FF8437",
          fontSize: 22,
        },

      });