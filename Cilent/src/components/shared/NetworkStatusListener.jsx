import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const NetworkStatusListener = () => {
  const [isOffline, setIsOffline] = useState(() => {
    return typeof navigator !== "undefined" ? !navigator.onLine : false;
  });

  useEffect(() => {
    const showOfflineToast = () => {
      setIsOffline(true);
      toast.error("Please check your internet connection.", {
        id: "network-status-offline",
      });
    };

    const showOnlineToast = () => {
      setIsOffline(false);
      toast.success("Your internet connection is restored.", {
        id: "network-status-online",
      });
    };

    window.addEventListener("offline", showOfflineToast);
    window.addEventListener("online", showOnlineToast);

    if (!navigator.onLine) {
      showOfflineToast();
    }

    return () => {
      window.removeEventListener("offline", showOfflineToast);
      window.removeEventListener("online", showOnlineToast);
    };
  }, []);

  return null;
};

export default NetworkStatusListener;
