

export default function StateMachine({ openPane, setOpenPane }) {

  return (
      <div
        onMouseEnter={() => setOpenPane("StateMachine")}
        onMouseLeave={() => setOpenPane("None")}
        // needed to detect hover and placement of popup
        style={{ position: "relative", cursor: "pointer", textAlign:'center'}}
      >
        <span
        style={{
          whiteSpace: "pre-wrap",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginRight: 10,
        }}
      >
        STATUS
      </span>
        
        {openPane == "StateMachine" && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              background: "white",
              border: "1px solid gray",
              padding: "10px",
              minWidth: "250px",
            }}
          >
    
            This is the state machine!
            


          </div>
        )}
      </div>
  );
}