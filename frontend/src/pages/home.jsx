import React, { useState, useEffect, useCallback } from "react";
import { FaTimes, FaFileAlt, FaSignOutAlt, FaTrash, FaCrown } from "react-icons/fa";
import "./styles/home.css";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { logoutUser } from "../utils/authUtils";
import LoadingPage from "./loading";
import LibraryShowcase from "./homeComponents/LibraryShowcase.jsx";
import { analytics, app } from "../analytics/firebaseAnalyze.js";
import { logEvent } from "firebase/analytics";
import { useLocation } from "react-router-dom";
import handleButtonClick from "../analytics/ButtonClickAnalytics.js";
import TutorialsShowcase from "./homeComponents/TutorialsShowcase";
import SEO from "../utils/SEO.jsx";

const Home = ({ subscriptionLevel, setSubscriptionLevel }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [communityExamples, setCommunityExamples] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [projectsGridRef, setProjectsGridRef] = useState(null);
  const [tutorialsGridRef, setTutorialsGridRef] = useState(null);
  const [tutorialsVideoGridRef, setTutorialsVideoGridRef] = useState(null);
  const [projectsGridHeight, setProjectsGridHeight] = useState(0);
  const [tutorialsGridHeight, setTutorialsGridHeight] = useState(0);
  const [tutorialsVideoGridHeight, setTutorialsVideoGridHeight] = useState(0);
  const [activeMenu, setActiveMenu] = useState("Home");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sceneToDelete, setSceneToDelete] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const location = useLocation();

  // Get the current location and analytics instance
  useEffect(() => {
    if (analytics) {
      logEvent(analytics, "home_page_view", {
        page_location: location.pathname,
        page_title: document.title, // Or get it from a route config
      });
    } else {
      console.warn("Analytics not initialized, page view event not logged.");
    }
  }, [location, analytics]);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/scenes`, {
        withCredentials: true,
      });
      if (response.status === 200) {
        const projectsWithThumbnails = await Promise.all(
          response.data.map(async (project) => {
            if (project.thumbnail_url) {
              try {
                const thumbResponse = await axios.get(
                  `${API_BASE_URL}/get-thumbnail-url?sceneId=${project.scene_id}`,
                  { withCredentials: true }
                );
                if (thumbResponse.status === 200) {
                  return { ...project, thumbnail_url: thumbResponse.data.thumbnailUrl };
                }
              } catch (error) {
                console.error("Error fetching thumbnail:", project.scene_id, error);
                return project;
              }
            }
            return project;
          })
        );
        setProjects(projectsWithThumbnails);
      } else {
        console.error("Failed to fetch projects:", response);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setProjectsLoading(false);
    }
  }, [API_BASE_URL]);

  const fetchCommunityExamples = useCallback(async () => {
    setCommunityLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/community-examples`, {
        withCredentials: true,
      });
      setCommunityExamples(response.data);
    } catch (error) {
      console.error("Error fetching community examples:", error);
    } finally {
      setCommunityLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        console.log("Attempting /auth/check request...");
        const response = await axios.get(`${API_BASE_URL}/auth/check`, {
          withCredentials: true,
        });
        console.log("/auth/check response data:", response.data);

        if (isMounted && response.data && response.data.username) {
          console.log("User authenticated:", response.data.username);
          setUsername(response.data.username);
          fetchProjects();
          fetchCommunityExamples();
          setSubscriptionLevel(response.data.subscription_level);
        } else {
          console.log("Auth check OK but no username, or component unmounted.");
          if (isMounted) {
            navigate("/login");
          }
        }
      } catch (error) {
        console.error("Error during /auth/check:", error);

        if (isMounted) {
          if (error.response) {
            console.error("Error response status:", error.response.status);
            console.error("Error response data:", error.response.data);
            if (error.response.status === 401) {
              console.log("Authentication failed (401), navigating to login.");
              navigate("/login");
            } else {
              console.log(`Server error (${error.response.status}), navigating to login.`);
              navigate("/login");
            }
          } else if (error.request) {
            console.error("No response received for /auth/check:", error.request);
            navigate("/login");
          } else {
            console.error('Error setting up request:', error.message);
            navigate("/login");
          }
        }
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    checkAuth();

    return () => {
      isMounted = false;
      console.log("Auth check effect unmounting.");
    };

  }, [navigate, setUsername, fetchProjects, fetchCommunityExamples, API_BASE_URL]);

  // useEffect(() => {
  //   const checkSubscription = async () => {
  //     try {
  //       const response = await axios.get("/payment/get-subscription", {
  //         withCredentials: true, // Important if your backend uses cookies/sessions
  //       });
  //       console.log("Subscription check response:", response.data.subscription_level);
  //       if (response) {
  //         console.log("User has an active subscription:", response.data.subscription_level);
  //         setSubscriptionLevel(response.data.subscription_level); // Set subscriptionLevel based on endpoint
  //       } else {
  //         setSubscriptionLevel("free"); // User has no active subscription
  //       }
  //     } catch (error) {
  //       console.error("Error fetching subscription:", error);
  //       setSubscriptionLevel("free"); // Assume 'free' on error (handle as appropriate)
  //     }
  //   };

  //   checkSubscription(); // Call the function when the component mounts
  // }, []);

  const handleFileInput = (acceptType) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = acceptType;
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };


  const handleFileUpload = async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("sceneName", file.name.split(".")[0]);
      formData.append("username", username);
      formData.append("sceneFile", file);

      const response = await axios.post(`${API_BASE_URL}/save`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        console.log("File uploaded:", response.data);
        // alert("File uploaded and scene created.");
        // fetchProjects();  <--  No need to fetch all projects, just update state
        navigate(`/editor?sceneId=${response.data.sceneId}`);
      } else {
        console.error("File upload failed:", response);
        // alert("File upload failed.");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      // alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
      handleButtonClick("Logout Button Clicked", "Logout", location.pathname);
      logoutUser();
      navigate("/")
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleLoadExample = (exampleId) => {
    navigate(`/editor?exampleId=${exampleId}`);
    handleButtonClick("Scene", "Loading Scene", location.pathname);
  };

  const handleTutorialClick = (videoUrl) => {
    window.open(videoUrl, '_blank');
  };

  useEffect(() => {
    if (!projectsLoading && projectsGridRef) {
      setProjectsGridHeight(projectsGridRef.clientHeight);
    }
    if (!communityLoading && tutorialsGridRef) {
      setTutorialsGridHeight(tutorialsGridRef.clientHeight);
    }
    if (tutorialsVideoGridRef) {
      setTutorialsVideoGridHeight(tutorialsVideoGridRef.clientHeight);
    }
  }, [projectsLoading, communityLoading, projectsGridRef, tutorialsGridRef, tutorialsVideoGridRef]);

  const handleWelcome = () => {
    navigate("/welcome");
  };

  const handleMenuClick = (menuItem) => {
    setActiveMenu(menuItem);
  };

  if (loading) {
    return <LoadingPage />;
  }

  const proFeatures = {
    Home: true,
    "My Files": true,
    "Shared with Me": true,
    Community: true,
    Tutorials: true,
    Library: true,
  };

  const proPlusFeatures = {
    Home: true,
    "My Files": true,
    "Shared with Me": true,
    Community: true,
    Tutorials: true,
    Library: true,
  };

  const isFeatureEnabled = (featureName) => {
    if (subscriptionLevel === "pro+") {
      return proPlusFeatures[featureName];
    } else if (subscriptionLevel === "pro") {
      return proFeatures[featureName];
    } else {
      return true;
    }
  };

  const isProUser = () => {
    return subscriptionLevel === "pro" || subscriptionLevel === "pro+";
  };

  const gotoMain = () => {
    navigate("/welcome");
  };

  const confirmDeleteScene = (sceneId) => {
    setSceneToDelete(sceneId);
    setShowDeleteModal(true);
  };

  const cancelDeleteScene = () => {
    setSceneToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeleteScene = async () => {
    setShowDeleteModal(false);
    setLoading(false);  // Start loading

    try {
      const response = await axios.delete(`${API_BASE_URL}/delete-scene?sceneId=${sceneToDelete}`, {
        withCredentials: true,
      });

      if (response.status === 200) {
        console.log("Scene deleted successfully:", response.data);
        //  fetchProjects(); // Refresh the projects list
         setProjects(prevProjects => prevProjects.filter(project => project.scene_id !== sceneToDelete)); // Update state
      } else {
        console.error("Failed to delete scene:", response);
        // alert("Failed to delete scene.");
      }
    } catch (error) {
      console.error("Error deleting scene:", error);
      // alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);  // End loading
      setSceneToDelete(null);
    }
  };


  return (
    <div className="home-container">

      <SEO
        title="ArtX3D- Your 3D Projects"
        description="Manage your 3D creations, explore the ArtX3D community, and access your account settings."
        keywords="3D projects, user dashboard, 3D art management, ArtX3D home"
        image="/site/home_preview.png"
        urlPath="/home"
      />

      <aside className="sidebar-home">
        <div className="profile-section">
          <div className="profile-icon">
            <img
              style={{ height: "38px" }}
              src="/3d/1logo.png"
              alt=""
              onClick={() => {
                handleButtonClick("Welcome Button Clicked", "Welcome", location.pathname);
                handleWelcome();
              }}
            />
          </div>
          <span>
            {isProUser() && <FaCrown style={{ color: "gold", marginLeft: "5px" }} />} {username}
          </span>
        </div>
        <nav className="menu">
          <Link
            to
            className={`menu-item ${activeMenu === "Home" ? "active" : ""}`}
            onClick={() => {
              handleButtonClick("Menu Clicked", "Home", location.pathname);
              handleMenuClick("Home");
            }}
          >
            Home
          </Link>
          <Link
            to
            className={`menu-item ${activeMenu === "My Files" ? "active" : ""}`}
            onClick={() => {
              handleButtonClick("Menu Clicked", "My Files", location.pathname);
              handleMenuClick("My Files");
            }}
          >
            My Files
          </Link>
          <Link
            to="/sharedwithme"
            className={`menu-item ${activeMenu === "Shared with Me" ? "active" : ""}`}
            onClick={() => {
              handleButtonClick("Menu Clicked", "Shared with Me", location.pathname);
              handleMenuClick("Shared with Me");
            }}
          >
            Shared with Me
          </Link>
          <Link
            to
            className={`menu-item ${activeMenu === "Community" ? "active" : ""}`}
            onClick={() => {
              handleButtonClick("Menu Clicked", "Community", location.pathname);
              handleMenuClick("Community");
            }}
          >
            Community
          </Link>
          {isFeatureEnabled("Tutorials") ? (
            <Link
              to
              className={`menu-item ${activeMenu === "Tutorials" ? "active" : ""}`}
              onClick={() => {
                handleButtonClick("Menu Clicked", "Tutorials", location.pathname);
                handleMenuClick("Tutorials");
              }}
            >
              Tutorials
            </Link>
          ) : null}
          {isFeatureEnabled("Library") ? (
            <Link
              to
              className={`menu-item ${activeMenu === "Library" ? "active" : ""}`}
              onClick={() => {
                handleButtonClick("Menu Clicked", "Library", location.pathname);
                handleMenuClick("Library");
              }}
            >
              Library
            </Link>
          ) : null}
          {/* <Link to="/inbox" className={`menu-item ${activeMenu === "Inbox" ? "active" : ""}`} onClick={() => { handleButtonClick("Menu Clicked", "Inbox", location.pathname); handleMenuClick("Inbox"); }}>
                Inbox
              </Link> */}
        </nav>

        <div className="upgrade-section">
          <button onClick={() => navigate("/upgrade")} className="upgrade-button">
            Upgrade
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header
          className="top-bar"
          style={{ display: activeMenu === "Home" ? "flex" : "none", justifyContent: "space-between", alignItems: "center" }}
        >
          <div style={{ display: "flex", alignItems: "center", color: "white" }}>
            <button
              onClick={gotoMain}
              style={{
                background: "none",
                border: "none",
                padding: "8px",
                cursor: "pointer",
                color: "white",
                display: "flex",
                alignItems: "center",
                marginTop:"40px"
              }}
            >
              <svg
              
                xmlns="http://www.w3.org/2000/svg"
                width="50"
                height="60"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-arrow-left"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <h1 >Welcome to the 3D space</h1>
          </div>

          <div className="logbtn">
            <button
              className="upgrade-button"
              onClick={() => {
                handleButtonClick("Logout Button Clicked", "Logout", location.pathname);
                handleLogout();
              }}
            >
              <FaSignOutAlt style={{ marginRight: "5px" }} />
              Logout
            </button>
          </div>
        </header>


        {(activeMenu === "Home" || activeMenu === "My Files") && (
          <section className="projects">
            <h2>Your Projects</h2>
            <div className="projects-grid" ref={setProjectsGridRef} style={{ minHeight: projectsGridHeight }}>
              <div
                onClick={() => {
                  handleButtonClick("New File Clicked", "New File", location.pathname);
                  navigate("/editor");
                }}
                className="project-card new-file"
              >
                <FaFileAlt style={{ marginRight: "8px" }} />
                <p>New File</p>
              </div>
              {projectsLoading ? (
                <>
                  <div className="project-card skeleton-loading">
                    <div className="project-thumbnail skeleton-loading"></div>
                    <p className="project-title skeleton-loading"></p>
                  </div>
                  <div className="project-card skeleton-loading">
                    <div className="project-thumbnail skeleton-loading"></div>
                    <p className="project-title skeleton-loading"></p>
                  </div>
                  <div className="project-card skeleton-loading">
                    <div className="project-thumbnail skeleton-loading"></div>
                    <p className="project-title skeleton-loading"></p>
                  </div>
                  <div className="project-card skeleton-loading">
                    <div className="project-thumbnail skeleton-loading "></div>
                    <p className="project-title skeleton-loading"></p>
                  </div>
                </>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.scene_id}
                    className="project-card"
                    onClick={() => {
                      handleButtonClick("Project Clicked", project.scene_name, location.pathname);
                      navigate(`/editor?sceneId=${project.scene_id}`);
                    }}
                  >
                    <div className="project-thumbnail">
                      {project.thumbnail_url ? (
                        <img src={project.thumbnail_url} alt={project.scene_name} />
                      ) : (
                        <div className="project-thumbnail"></div>
                      )}
                    </div>
                    <p className="project-title">{project.scene_name}</p>
                    <FaTrash
                      style={{
                        position: "absolute",
                        marginLeft: "248px",
                        marginTop: "245px",
                        color: "rgba(255, 255, 255, 0.93)",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent navigating to editor
                        handleButtonClick("Delete Project Clicked", project.scene_name, location.pathname);
                        confirmDeleteScene(project.scene_id); // Call function to show modal
                      }}
                    />
                    <p className="lastupdated">Last updated {project.last_updated}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {(activeMenu === "Home" || activeMenu === "Community") && (
          <section className="tutorials">
            <h2>Community Examples</h2>
            <div className="tutorials-grid" ref={setTutorialsGridRef} style={{ minHeight: tutorialsGridHeight }}>
              {communityLoading ? (
                <>
                  <div className="tutorial-card skeleton-loading">
                    <div className="project-thumbnail skeleton-loading"></div>
                    <p className="project-title skeleton-loading"></p>
                  </div>
                  <div className="tutorial-card skeleton-loading">
                    <div className="project-thumbnail skeleton-loading"></div>
                    <p className="project-title skeleton-loading"></p>
                  </div>
                  <div className="tutorial-card skeleton-loading">
                    <div className="project-thumbnail skeleton-loading"></div>
                    <p className="project-title skeleton-loading"></p>
                  </div>
                  <div className="tutorial-card skeleton-loading">
                    <div className="project-thumbnail skeleton-loading"></div>
                    <p className="project-title skeleton-loading"></p>
                  </div>
                </>
              ) : (
                communityExamples.map((example) => (
                  <div
                    key={example.example_id}
                    className="tutorial-card"
                    onClick={() => {
                      handleButtonClick("Community Example Clicked", example.example_name, location.pathname);
                      handleLoadExample(example.example_id);
                    }}
                  >
                    <div className="project-thumbnail">
                      {example.thumbnail_s3_key ? (
                        <img src={`${example.thumbnail_s3_key}`} alt={example.example_name} className="example-thumbnail" />
                      ) : (
                        <div className="project-thumbnail"></div>
                      )}
                    </div>
                    <p className="project-title">{example.example_name}</p>
                    <p>{example.description}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeMenu === "Tutorials" && (
          <section>
            <TutorialsShowcase />
          </section>
        )}


        {activeMenu === "Library" && (
          <section className="library-section">
            <LibraryShowcase />
          </section>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="delete-modal">
            <div className="delete-modal-content">
              <h2>Confirm Delete</h2>
              <p>Are you sure you want to delete this scene?</p>
              <div className="delete-modal-buttons">
                <button className="delete-confirm-button" onClick={handleDeleteScene}>
                  Yes, Delete
                </button>
                <button className="delete-cancel-button" onClick={cancelDeleteScene}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;