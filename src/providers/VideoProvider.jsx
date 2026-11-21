import { VideoContext } from "../contexts/VideoContext";
import { useVideoData } from "../components/video/VideoData";

export const VideoProvider = ({ children }) => {
  const videoStats = useVideoData();

  return (
    <VideoContext.Provider value={videoStats}>
      {children}
    </VideoContext.Provider>
  );
};

export default VideoProvider;