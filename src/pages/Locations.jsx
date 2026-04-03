import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { API_BASE_URL, MAPQUEST_KEY } from "../services/api";

export default function Locations() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [storedUser, setStoredUser] = useState(
    JSON.parse(localStorage.getItem("user") || "{}")
  );

  const [locations, setLocations] = useState([]);
  const [searchText, setSearchText] = useState("");

  const [form, setForm] = useState({
    location: "",
    description: "",
    latitude: "",
    longitude: "",
    city: "",
    province: "",
    source_type: "manual",
  });

  const [image, setImage] = useState(null);
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    location_id: "",
    location: "",
    description: "",
    latitude: "",
    longitude: "",
    city: "",
    province: "",
    source_type: "manual",
    current_image_path: "",
  });
  const [editImage, setEditImage] = useState(null);
  const [editGeneratedPreviewUrl, setEditGeneratedPreviewUrl] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [notification, setNotification] = useState({
    open: false,
    type: "",
    text: "",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [startQuery, setStartQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedDest, setSelectedDest] = useState(null);

  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routeInfo, setRouteInfo] = useState(null);
  const [maneuvers, setManeuvers] = useState([]);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const savedMarkersRef = useRef([]);

  const skipStartSuggestRef = useRef(false);
  const skipDestSuggestRef = useRef(false);

  const addImageInputRef = useRef(null);
  const editImageInputRef = useRef(null);

  const addLocationSectionRef = useRef(null);
  const guideScrollTimeoutRef = useRef(null);
  const guideHighlightTimeoutRef = useRef(null);
  const modalOpenTimeoutRef = useRef(null);
  const [focusCrudForm, setFocusCrudForm] = useState(false);

  useEffect(() => {
    fetchLocations();
    refreshCurrentUser();
  }, []);

  useEffect(() => {
    if (!MAPQUEST_KEY) {
      setRouteError("MapQuest API key is missing. Add VITE_MAPQUEST_KEY in frontend .env");
      return;
    }

    loadMapQuestScript();
  }, []);

  useEffect(() => {
    const handleClickOutsideMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideMenu);

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideMenu);
    };
  }, []);

  useEffect(() => {
    if (!notification.open) return;

    const timer = setTimeout(() => {
      setNotification({ open: false, type: "", text: "" });
    }, 3000);

    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    if (skipStartSuggestRef.current) {
      skipStartSuggestRef.current = false;
      setStartSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      if (startQuery.trim().length >= 2) {
        fetchSuggestions(startQuery, "start");
      } else {
        setStartSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [startQuery]);

  useEffect(() => {
    if (skipDestSuggestRef.current) {
      skipDestSuggestRef.current = false;
      setDestSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      if (destQuery.trim().length >= 2) {
        fetchSuggestions(destQuery, "dest");
      } else {
        setDestSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [destQuery]);

  useEffect(() => {
    renderSavedLocationMarkers();
  }, [locations]);

  useEffect(() => {
    return () => {
      clearCrudGuide();

      if (modalOpenTimeoutRef.current) {
        clearTimeout(modalOpenTimeoutRef.current);
        modalOpenTimeoutRef.current = null;
      }
    };
  }, []);

  const showNotification = (type, text) => {
    setNotification({
      open: true,
      type,
      text,
    });
  };

  const refreshCurrentUser = async () => {
    try {
      const res = await api.get("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const updatedUser = {
        ...(JSON.parse(localStorage.getItem("user") || "{}")),
        user_id: res.data.user_id,
        fullname: res.data.fullname || "",
        username: res.data.username || "",
        email: res.data.email || "",
        profile_image: res.data.profile_image || "",
        is_verified: res.data.is_verified,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setStoredUser(updatedUser);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    }
  };

  const clearCrudGuide = () => {
    if (guideScrollTimeoutRef.current) {
      clearTimeout(guideScrollTimeoutRef.current);
      guideScrollTimeoutRef.current = null;
    }

    if (guideHighlightTimeoutRef.current) {
      clearTimeout(guideHighlightTimeoutRef.current);
      guideHighlightTimeoutRef.current = null;
    }

    setFocusCrudForm(false);
  };

  const guideToCrudForm = () => {
    clearCrudGuide();
    setFocusCrudForm(true);

    guideScrollTimeoutRef.current = setTimeout(() => {
      if (!addLocationSectionRef.current) return;

      const top =
        addLocationSectionRef.current.getBoundingClientRect().top +
        window.pageYOffset -
        24;

      window.scrollTo({
        top,
        behavior: "smooth",
      });

      guideScrollTimeoutRef.current = null;
    }, 120);

    guideHighlightTimeoutRef.current = setTimeout(() => {
      setFocusCrudForm(false);
      guideHighlightTimeoutRef.current = null;
    }, 2600);
  };

  const openModalFromTop = (openCallback) => {
    clearCrudGuide();

    if (modalOpenTimeoutRef.current) {
      clearTimeout(modalOpenTimeoutRef.current);
      modalOpenTimeoutRef.current = null;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    modalOpenTimeoutRef.current = setTimeout(() => {
      openCallback();
      modalOpenTimeoutRef.current = null;
    }, 220);
  };

  const filteredLocations = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return locations;

    return locations.filter((item) => {
      return [
        item.location,
        item.description,
        item.city,
        item.province,
        item.fullname,
        item.username,
        item.latitude,
        item.longitude,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [locations, searchText]);

  const savedImageSrc = (path) => {
    if (!path) return "";
    const cleanPath = String(path).trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
      return cleanPath;
    }
    return `${API_BASE_URL}/${cleanPath}`;
  };

  const getAddImageStatusText = () => {
    if (image) return image.name;
    if (generatedPreviewUrl) return "Automatic map preview is ready";
    return "No image selected";
  };

  const getEditImageStatusText = () => {
    if (editImage) return editImage.name;
    if (editForm.current_image_path) return "Current saved image will remain";
    if (editGeneratedPreviewUrl) return "Automatic map preview is ready";
    return "No image selected";
  };

  const fetchLocations = async () => {
    setFetching(true);

    try {
      const res = await api.get("/api/locations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setLocations(res.data || []);
    } catch (err) {
      showNotification(
        "error",
        err.response?.data?.message || "Failed to load locations."
      );

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setFetching(false);
    }
  };

  const loadMapQuestScript = () => {
    if (window.L && window.L.mapquest) {
      initializeMap();
      return;
    }

    const existingCss = document.getElementById("mapquest-css");
    if (!existingCss) {
      const link = document.createElement("link");
      link.id = "mapquest-css";
      link.rel = "stylesheet";
      link.href = "https://api.mqcdn.com/sdk/mapquest-js/v1.3.2/mapquest.css";
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById("mapquest-js");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "mapquest-js";
      script.src = "https://api.mqcdn.com/sdk/mapquest-js/v1.3.2/mapquest.js";
      script.async = true;
      script.onload = initializeMap;
      document.body.appendChild(script);
    } else {
      existingScript.onload = initializeMap;
    }
  };

  const initializeMap = () => {
    if (!window.L || !window.L.mapquest || mapInstanceRef.current || !mapRef.current) {
      return;
    }

    window.L.mapquest.key = MAPQUEST_KEY;

    mapInstanceRef.current = window.L.mapquest.map(mapRef.current, {
      center: [8.4542, 123.7561],
      layers: window.L.mapquest.tileLayer("map"),
      zoom: 6,
    });

    renderSavedLocationMarkers();
  };

  const fetchSuggestions = async (query, type) => {
    try {
      const url = `https://www.mapquestapi.com/search/v3/prediction?key=${MAPQUEST_KEY}&q=${encodeURIComponent(
        query
      )}&limit=6&collection=adminArea,address,poi`;

      const res = await fetch(url);
      const data = await res.json();

      const results = (data.results || []).map((item, index) => ({
        id: item.mqap_id || item.place?.id || `${item.displayString}-${index}`,
        displayString: item.displayString,
      }));

      if (type === "start") setStartSuggestions(results);
      else setDestSuggestions(results);
    } catch {
      if (type === "start") setStartSuggestions([]);
      else setDestSuggestions([]);
    }
  };

  const geocodeCoordinates = async (text) => {
    const url = `https://www.mapquestapi.com/geocoding/v1/address?key=${MAPQUEST_KEY}&location=${encodeURIComponent(
      text
    )}`;

    const res = await fetch(url);
    const data = await res.json();

    const loc = data?.results?.[0]?.locations?.[0];
    const latLng = loc?.latLng;

    if (!latLng) return null;

    return {
      lat: latLng.lat,
      lng: latLng.lng,
      city: loc.adminArea5 || "",
      province: loc.adminArea3 || "",
    };
  };

  const buildStaticMapPreview = (lat, lng) => {
    return `https://www.mapquestapi.com/staticmap/v5/map?key=${MAPQUEST_KEY}&center=${lat},${lng}&size=700,400@2x&zoom=14&locations=${encodeURIComponent(`${lat},${lng}|marker-red`)}`;
  };

  const clearSuggestions = () => {
    setStartSuggestions([]);
    setDestSuggestions([]);
  };

  const selectSuggestion = async (item, type) => {
    clearSuggestions();

    const coords = await geocodeCoordinates(item.displayString);
    if (!coords) return;

    const selected = {
      displayString: item.displayString,
      latLng: {
        lat: coords.lat,
        lng: coords.lng,
      },
    };

    if (type === "start") {
      skipStartSuggestRef.current = true;
      setSelectedStart(selected);
      setStartQuery(item.displayString);
      setStartSuggestions([]);
    } else {
      skipDestSuggestRef.current = true;
      setSelectedDest(selected);
      setDestQuery(item.displayString);
      setDestSuggestions([]);

      setForm((prev) => ({
        ...prev,
        location: item.displayString,
        latitude: String(coords.lat),
        longitude: String(coords.lng),
        city: coords.city || prev.city,
        province: coords.province || prev.province,
      }));

      setGeneratedPreviewUrl(buildStaticMapPreview(coords.lat, coords.lng));
      showNotification("success", "Destination selected. Click Get Route to continue.");
    }
  };

  const handleSuggestionMouseDown = (item, type) => {
    selectSuggestion(item, type);
  };

  const clearRoute = () => {
    setRouteInfo(null);
    setManeuvers([]);
    setRouteError("");

    if (routeLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (startMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }

    if (destMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }
  };

  const clearPlannerState = () => {
    clearCrudGuide();

    if (modalOpenTimeoutRef.current) {
      clearTimeout(modalOpenTimeoutRef.current);
      modalOpenTimeoutRef.current = null;
    }

    setStartQuery("");
    setDestQuery("");
    setSelectedStart(null);
    setSelectedDest(null);
    setStartSuggestions([]);
    setDestSuggestions([]);
    setGeneratedPreviewUrl("");
    setRouteInfo(null);
    setManeuvers([]);
    setRouteError("");
    clearRoute();
  };

  const drawMarkers = (startLatLng, destLatLng) => {
    if (!mapInstanceRef.current || !window.L) return;

    if (startMarkerRef.current) {
      mapInstanceRef.current.removeLayer(startMarkerRef.current);
    }

    if (destMarkerRef.current) {
      mapInstanceRef.current.removeLayer(destMarkerRef.current);
    }

    startMarkerRef.current = window.L.marker([startLatLng.lat, startLatLng.lng]).addTo(
      mapInstanceRef.current
    );

    destMarkerRef.current = window.L.marker([destLatLng.lat, destLatLng.lng]).addTo(
      mapInstanceRef.current
    );
  };

  const drawRouteShape = (shapePoints) => {
    if (!mapInstanceRef.current || !window.L || !Array.isArray(shapePoints)) return;

    if (routeLayerRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current);
    }

    const latLngs = [];
    for (let i = 0; i < shapePoints.length; i += 2) {
      latLngs.push([shapePoints[i], shapePoints[i + 1]]);
    }

    routeLayerRef.current = window.L.polyline(latLngs, {
      color: "#0f6cbd",
      weight: 6,
      opacity: 0.9,
    }).addTo(mapInstanceRef.current);

    mapInstanceRef.current.fitBounds(routeLayerRef.current.getBounds(), {
      padding: [30, 30],
    });
  };

  const renderSavedLocationMarkers = () => {
    if (!mapInstanceRef.current || !window.L) return;

    savedMarkersRef.current.forEach((marker) => {
      mapInstanceRef.current.removeLayer(marker);
    });
    savedMarkersRef.current = [];

    locations.forEach((item) => {
      if (!item.latitude || !item.longitude) return;

      const popupHtml = `
        <div style="min-width:220px;padding:4px 2px;">
          <div style="font-size:15px;font-weight:700;margin-bottom:6px;">${item.location || "-"}</div>
          <div style="font-size:12px;color:#50657c;line-height:1.55;">
            ${item.description || "No description provided."}
          </div>
          <div style="margin-top:8px;font-size:12px;color:#50657c;">
            City: ${item.city || "-"}<br/>
            Province: ${item.province || "-"}
          </div>
        </div>
      `;

      const marker = window.L.marker([Number(item.latitude), Number(item.longitude)])
        .addTo(mapInstanceRef.current)
        .bindPopup(popupHtml);

      savedMarkersRef.current.push(marker);
    });
  };

  const handleGetRoute = async () => {
    clearSuggestions();
    setRouteError("");
    setRouteInfo(null);
    setManeuvers([]);

    let start = selectedStart;
    let dest = selectedDest;

    if (!start && startQuery.trim()) {
      const coords = await geocodeCoordinates(startQuery.trim());
      if (coords) {
        start = {
          displayString: startQuery.trim(),
          latLng: coords,
        };
        setSelectedStart(start);
      }
    }

    if (!dest && destQuery.trim()) {
      const coords = await geocodeCoordinates(destQuery.trim());
      if (coords) {
        dest = {
          displayString: destQuery.trim(),
          latLng: coords,
        };
        setSelectedDest(dest);

        setForm((prev) => ({
          ...prev,
          location: destQuery.trim(),
          latitude: String(coords.lat),
          longitude: String(coords.lng),
          city: coords.city || prev.city,
          province: coords.province || prev.province,
        }));

        setGeneratedPreviewUrl(buildStaticMapPreview(coords.lat, coords.lng));
      }
    }

    if (!start?.latLng || !dest?.latLng) {
      setRouteError("Please choose valid start and destination locations.");
      return;
    }

    setRouteLoading(true);
    clearRoute();

    try {
      const from = `${start.latLng.lat},${start.latLng.lng}`;
      const to = `${dest.latLng.lat},${dest.latLng.lng}`;

      const url = `https://www.mapquestapi.com/directions/v2/route?key=${MAPQUEST_KEY}&from=${encodeURIComponent(
        from
      )}&to=${encodeURIComponent(
        to
      )}&outFormat=json&routeType=fastest&unit=k&fullShape=true&narrativeType=text`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.info?.statuscode !== 0) {
        setRouteError(data.info?.messages?.[0] || "Failed to get route.");
        return;
      }

      const route = data.route;

      setRouteInfo({
        distance: route.distance,
        formattedTime: route.formattedTime,
      });

      setManeuvers(route.legs?.[0]?.maneuvers || []);
      drawMarkers(start.latLng, dest.latLng);
      drawRouteShape(route.shape?.shapePoints || []);
      guideToCrudForm();

      showNotification("success", "Route ready. Review the selected destination below.");
    } catch {
      setRouteError("Failed to get route. Please try again.");
    } finally {
      setRouteLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleEditChange = (e) => {
    setEditForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setForm({
      location: "",
      description: "",
      latitude: "",
      longitude: "",
      city: "",
      province: "",
      source_type: "manual",
    });
    setImage(null);
    setGeneratedPreviewUrl("");
  };

  const openEditModal = (item) => {
    openModalFromTop(() => {
      setEditForm({
        location_id: item.location_id,
        location: item.location || "",
        description: item.description || "",
        latitude: item.latitude || "",
        longitude: item.longitude || "",
        city: item.city || "",
        province: item.province || "",
        source_type: item.source_type || "manual",
        current_image_path: item.image_path || "",
      });

      setEditImage(null);
      setEditGeneratedPreviewUrl(
        item.latitude && item.longitude
          ? buildStaticMapPreview(Number(item.latitude), Number(item.longitude))
          : ""
      );
      setEditModalOpen(true);
    });
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditImage(null);
    setEditGeneratedPreviewUrl("");
  };

  const openDeleteModal = (item) => {
    openModalFromTop(() => {
      setDeleteTarget(item);
      setDeleteModalOpen(true);
    });
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("location", form.location);
      formData.append("description", form.description);
      formData.append("latitude", form.latitude);
      formData.append("longitude", form.longitude);
      formData.append("city", form.city);
      formData.append("province", form.province);

      const finalSourceType = image ? "manual" : generatedPreviewUrl ? "generated" : "manual";
      formData.append("source_type", finalSourceType);

      if (image) {
        formData.append("image", image);
      }

      if (!image && generatedPreviewUrl) {
        formData.append("generated_preview_url", generatedPreviewUrl);
      }

      const res = await api.post("/api/locations", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      showNotification("success", res.data.message || "Location added successfully.");
      resetForm();
      clearPlannerState();
      fetchLocations();
      refreshCurrentUser();
    } catch (err) {
      showNotification(
        "error",
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to save location."
      );

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("_method", "PUT");
      formData.append("location", editForm.location);
      formData.append("description", editForm.description);
      formData.append("latitude", editForm.latitude);
      formData.append("longitude", editForm.longitude);
      formData.append("city", editForm.city);
      formData.append("province", editForm.province);
      formData.append(
        "source_type",
        editImage ? "manual" : editForm.source_type || "generated"
      );

      if (editImage) {
        formData.append("image", editImage);
      }

      if (!editImage && editGeneratedPreviewUrl && !editForm.current_image_path) {
        formData.append("generated_preview_url", editGeneratedPreviewUrl);
      }

      const res = await api.post(`/api/locations/${editForm.location_id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      showNotification("success", res.data.message || "Location updated successfully.");
      closeEditModal();
      fetchLocations();
      refreshCurrentUser();
    } catch (err) {
      showNotification(
        "error",
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to update location."
      );

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setLoading(true);

    try {
      const res = await api.delete(`/api/locations/${deleteTarget.location_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      showNotification("success", res.data.message || "Deleted successfully.");
      closeDeleteModal();
      fetchLocations();
      refreshCurrentUser();
    } catch (err) {
      showNotification(
        "error",
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to delete location."
      );

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post(
        "/api/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  const useCurrentLocationAsStart = () => {
    if (!navigator.geolocation) {
      setRouteError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const exactText = `${lat}, ${lng}`;

        skipStartSuggestRef.current = true;
        setSelectedStart({
          displayString: exactText,
          latLng: { lat, lng },
        });
        setStartQuery(exactText);
      },
      () => {
        setRouteError("Unable to get your current location.");
      }
    );
  };

  return (
    <div className="page-wrap">
      {notification.open && (
        <div className={`floating-notification ${notification.type}`}>
          <span>{notification.text}</span>
          <button
            type="button"
            className="floating-notification-close"
            onClick={() => setNotification({ open: false, type: "", text: "" })}
          >
            ×
          </button>
        </div>
      )}

      <div className="page-card location-page">
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-kicker">GIS Operations Console</div>
            <div className="page-title-row">
              <h2>GIS</h2>
            </div>
            <div className="page-summary">
              Search routes, inspect the live map, save destination records, and
              manage your location inventory from one dashboard-style GIS page.
            </div>
          </div>

          <div className="top-actions" ref={menuRef}>
            <button
              type="button"
              className="profile-trigger-btn"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {storedUser.profile_image ? (
                <img
                  src={savedImageSrc(storedUser.profile_image)}
                  alt="avatar"
                  className="profile-trigger-img"
                />
              ) : (
                <div className="profile-trigger-placeholder">
                  {storedUser.username?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}

              <div className="profile-trigger-meta">
                <span className="profile-trigger-label">Signed in as</span>
                <span className="profile-trigger-name">
                  {storedUser.fullname || storedUser.username || "GIS User"}
                </span>
              </div>
            </button>

            {menuOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-user">
                  <div className="dropdown-user-info">
                    {storedUser.profile_image ? (
                      <img
                        src={savedImageSrc(storedUser.profile_image)}
                        alt="avatar"
                        className="dropdown-avatar"
                      />
                    ) : (
                      <div className="dropdown-avatar placeholder">
                        {storedUser.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}

                    <div>
                      <div className="dropdown-name">
                        {storedUser.fullname || storedUser.username}
                      </div>
                      <div className="dropdown-email">{storedUser.email}</div>
                    </div>
                  </div>
                </div>

                <Link to="/profile" onClick={() => setMenuOpen(false)}>
                  Open Profile
                </Link>

                <button
                  type="button"
                  className="dropdown-logout-btn"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {routeError && <div className="error-box">{routeError}</div>}

        <div className="gis-hero-grid">
          <div className="planner-card planner-card-redesigned">
            <div className="card-head planner-head">
              <div>
                <h3>Planner Controls</h3>
                <p>Choose a start point and destination to generate a route.</p>
              </div>
            </div>

            <div className="planner-fields">
              <div className="field-group">
                <label className="field-label">Start Location</label>
                <div className="suggestion-group">
                  <input
                    type="text"
                    placeholder="Search start location"
                    value={startQuery}
                    onChange={(e) => {
                      skipStartSuggestRef.current = false;
                      setStartQuery(e.target.value);
                      setSelectedStart(null);
                    }}
                    onBlur={() => {
                      setTimeout(() => setStartSuggestions([]), 150);
                    }}
                  />
                  {startSuggestions.length > 0 && (
                    <div className="suggestion-list">
                      {startSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="suggestion-item"
                          onMouseDown={() => handleSuggestionMouseDown(item, "start")}
                        >
                          {item.displayString}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="planner-route-arrow">↓</div>

              <div className="field-group">
                <label className="field-label">Destination</label>
                <div className="suggestion-group">
                  <input
                    type="text"
                    placeholder="Search destination"
                    value={destQuery}
                    onChange={(e) => {
                      skipDestSuggestRef.current = false;
                      setDestQuery(e.target.value);
                      setSelectedDest(null);
                    }}
                    onBlur={() => {
                      setTimeout(() => setDestSuggestions([]), 150);
                    }}
                  />
                  {destSuggestions.length > 0 && (
                    <div className="suggestion-list">
                      {destSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="suggestion-item"
                          onMouseDown={() => handleSuggestionMouseDown(item, "dest")}
                        >
                          {item.displayString}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="planner-actions planner-actions-redesigned">
                <button type="button" onClick={useCurrentLocationAsStart}>
                  Use My Location
                </button>

                <button type="button" onClick={handleGetRoute} disabled={routeLoading}>
                  {routeLoading ? "Generating Route..." : "Get Route"}
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    clearPlannerState();
                  }}
                >
                  Clear Route
                </button>
              </div>

              {routeInfo && (
                <div className="route-summary redesigned-route-summary">
                  <div className="route-summary-header">
                    <h4>Route Summary</h4>
                    <span className="route-summary-badge">Active Route</span>
                  </div>

                  <div className="route-summary-grid stacked">
                    <div className="route-summary-item">
                      <span>Distance</span>
                      <strong>{routeInfo.distance} km</strong>
                    </div>
                    <div className="route-summary-item">
                      <span>Travel Time</span>
                      <strong>{routeInfo.formattedTime}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="outline-btn route-save-jump-btn"
                    onClick={guideToCrudForm}
                  >
                    Save This Destination
                  </button>
                </div>
              )}

              {generatedPreviewUrl && (
                <div className="destination-preview-card">
                  <div className="mini-card-head">
                    <h4>Destination Preview</h4>
                    <span>Auto Generated</span>
                  </div>
                  <img
                    src={generatedPreviewUrl}
                    alt="Destination Preview"
                    className="destination-preview-image"
                  />
                  <div className="destination-preview-note">
                    This preview can be used automatically when no manual image
                    is uploaded for the new location record.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="map-card map-card-redesigned">
            <div className="map-toolbar">
              <div className="map-toolbar-left">
                <h3>Interactive Map</h3>
                <p>Live route map with saved location markers.</p>
              </div>
              <div className="map-status-badge">
                {fetching ? "Loading markers..." : `${locations.length} saved locations`}
              </div>
            </div>

            <div className="map-frame">
              <div ref={mapRef} className="map-container" />

              <div className="map-overlay-chip top-left">GIS Map View</div>

              <div className="map-overlay-chip bottom-left">
                {routeInfo ? "Route visualized on map" : "No route selected yet"}
              </div>
            </div>
          </div>

          <div className="stats-stack">
            <div className="stat-card stat-card-glow">
              <div>
                <div className="stat-card-label">Saved Locations</div>
                <div className="stat-card-value">{locations.length}</div>
              </div>
              <div className="stat-card-foot">
                Total location records currently available in your GIS list.
              </div>
            </div>

            <div className="stat-card stat-card-mini">
              <div>
                <div className="stat-card-label">Search Matches</div>
                <div className="stat-card-value">{filteredLocations.length}</div>
              </div>
              <div className="stat-card-foot">
                Records currently shown in the inventory table.
              </div>
            </div>

            <div className="stat-card stat-card-mini">
              <div>
                <div className="stat-card-label">Route Status</div>
                <div className="stat-card-value stat-card-text">
                  {routeInfo ? "Ready" : "Idle"}
                </div>
              </div>
              <div className="stat-card-foot">
                Planner state based on current origin and destination inputs.
              </div>
            </div>
          </div>
        </div>

        {maneuvers.length > 0 && (
          <div className="directions-card">
            <div className="card-head">
              <div>
                <h3>Turn-by-Turn Directions</h3>
                <p>Review the navigation steps for the current route.</p>
              </div>
              <div className="head-badge">Navigation</div>
            </div>

            <ol className="maneuver-list">
              {maneuvers.map((m, index) => (
                <li key={index}>
                  <div className="maneuver-index">{index + 1}</div>
                  <div className="maneuver-content">
                    <div className="maneuver-text">{m.narrative}</div>
                    <div className="maneuver-meta">
                      {m.distance} km • {Math.round((m.time || 0) / 60)} min
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="bottom-grid redesigned-bottom-grid">
          <div
            ref={addLocationSectionRef}
            className={`crud-section ${focusCrudForm ? "crud-section-highlight" : ""}`}
          >
            <div className="card-head">
              <div>
                <h3>Add New Location</h3>
                <p>
                  Save a destination or mapped place into your location
                  inventory.
                </p>
              </div>
              <div className="head-badge">Create</div>
            </div>

            {form.location && form.latitude && form.longitude && (
              <div className="info-box crud-helper-box">
                Selected destination loaded. Review the details below, then click
                <strong> Add Location</strong> to save it.
              </div>
            )}

            <form onSubmit={handleSubmit} className="location-form">
              <div className="location-form-grid">
                <div className="field-group full-span">
                  <label className="field-label">Location Name</label>
                  <input
                    type="text"
                    name="location"
                    placeholder="Enter location name"
                    value={form.location}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field-group full-span">
                  <label className="field-label">Description</label>
                  <textarea
                    name="description"
                    placeholder="Enter location description"
                    value={form.description}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    name="latitude"
                    placeholder="Enter latitude"
                    value={form.latitude}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    name="longitude"
                    placeholder="Enter longitude"
                    value={form.longitude}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">City</label>
                  <input
                    type="text"
                    name="city"
                    placeholder="Enter city"
                    value={form.city}
                    onChange={handleChange}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Province</label>
                  <input
                    type="text"
                    name="province"
                    placeholder="Enter province"
                    value={form.province}
                    onChange={handleChange}
                  />
                </div>

                <div className="field-group full-span">
                  <label className="field-label">Location Image</label>
                  <div className="custom-file-wrap">
                    <input
                      ref={addImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden-file-input"
                      onChange={(e) => setImage(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => addImageInputRef.current?.click()}
                    >
                      Choose Manual Image
                    </button>
                    <div className="file-status-text">{getAddImageStatusText()}</div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={loading}>
                  {loading ? "Saving location..." : "Add Location"}
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    resetForm();
                    clearPlannerState();
                  }}
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>

          <div className="data-card">
            <div className="data-toolbar">
              <div>
                <h3>Saved Location Inventory</h3>
              </div>

              <div className="data-search">
                <input
                  type="text"
                  placeholder="Search locations, city, province, entity..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            <div className="table-wrap">
              {fetching ? (
                <div className="empty-state">Loading locations...</div>
              ) : filteredLocations.length === 0 ? (
                <div className="empty-state">No locations found.</div>
              ) : (
                <table className="location-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Location</th>
                      <th>Coordinates</th>
                      <th>City</th>
                      <th>Province</th>
                      <th>Assigned Entity</th>
                      <th>Source</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLocations.map((item) => (
                      <tr key={item.location_id}>
                        <td>
                          {item.image_path ? (
                            <img
                              src={savedImageSrc(item.image_path)}
                              alt={item.location}
                              className="location-image"
                            />
                          ) : (
                            <div className="coord-pill">No image</div>
                          )}
                        </td>

                        <td className="location-name-cell">
                          <div className="location-name-title">{item.location}</div>
                          <div className="location-name-desc">
                            {item.description || "No description provided."}
                          </div>
                        </td>

                        <td>
                          <div className="coord-pill">
                            {item.latitude}, {item.longitude}
                          </div>
                        </td>

                        <td>{item.city || "-"}</td>
                        <td>{item.province || "-"}</td>

                        <td>
                          <span className="entity-pill">
                            {item.fullname || item.username || "Unassigned"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`source-pill ${
                              item.source_type === "manual" ? "manual" : "generated"
                            }`}
                          >
                            {item.source_type || "generated"}
                          </span>
                        </td>

                        <td>
                          <div className="table-actions">
                            <button type="button" onClick={() => openEditModal(item)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => openDeleteModal(item)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {editModalOpen && (
          <div className="modal-overlay">
            <div className="custom-modal">
              <div className="modal-header">
                <div>
                  <h3>Edit Location</h3>
                  <p>Update the selected location information and image.</p>
                </div>

                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={closeEditModal}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="location-form">
                <div className="location-form-grid">
                  <div className="field-group full-span">
                    <label className="field-label">Location Name</label>
                    <input
                      type="text"
                      name="location"
                      placeholder="Enter location name"
                      value={editForm.location}
                      onChange={handleEditChange}
                      required
                    />
                  </div>

                  <div className="field-group full-span">
                    <label className="field-label">Description</label>
                    <textarea
                      name="description"
                      placeholder="Enter location description"
                      value={editForm.description}
                      onChange={handleEditChange}
                      rows="3"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      name="latitude"
                      placeholder="Enter latitude"
                      value={editForm.latitude}
                      onChange={handleEditChange}
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      name="longitude"
                      placeholder="Enter longitude"
                      value={editForm.longitude}
                      onChange={handleEditChange}
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">City</label>
                    <input
                      type="text"
                      name="city"
                      placeholder="Enter city"
                      value={editForm.city}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Province</label>
                    <input
                      type="text"
                      name="province"
                      placeholder="Enter province"
                      value={editForm.province}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="field-group full-span">
                    <label className="field-label">Location Image</label>
                    <div className="custom-file-wrap">
                      <input
                        ref={editImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden-file-input"
                        onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        className="outline-btn"
                        onClick={() => editImageInputRef.current?.click()}
                      >
                        Choose New Manual Image
                      </button>
                      <div className="file-status-text">{getEditImageStatusText()}</div>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={closeEditModal}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteModalOpen && deleteTarget && (
          <div className="modal-overlay">
            <div className="custom-modal delete-modal">
              <div className="modal-header">
                <div>
                  <h3>Delete Location</h3>
                  <p>This action will remove the selected location record.</p>
                </div>

                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={closeDeleteModal}
                >
                  ×
                </button>
              </div>

              <div className="delete-confirm-text">
                Are you sure you want to delete <strong>{deleteTarget.location}</strong>?
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="delete-btn"
                  onClick={handleDeleteConfirm}
                >
                  Yes, Delete
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeDeleteModal}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}