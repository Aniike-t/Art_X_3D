import React, { useState, useEffect } from "react";
import { FaTimes, FaFileAlt, FaSignOutAlt } from "react-icons/fa";
import "./styles/home.css";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { logoutUser } from "../utils/authUtils";
import LoadingPage from "./loading";

const Home = () => {
  const navigate = useNavigate();
  const [isImportPanelOpen, setImportPanelOpen] = useState(false);
  const [isGeneratePanelOpen, setGeneratePanelOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false); // Add loading state for projects

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Use the /auth/check endpoint, as it was designed for this.
        const response = await axios.get("http://localhost:5050/auth/check", {
          withCredentials: true,
        });
        // Get the username from the *response* of /auth/check.
        console.log("User authenticated:", response.data);
        if(response.data.username === undefined || response.data.username === null){
          navigate("/");
        }
        setUsername(response.data.username);
        fetchProjects();
      } catch (error) {
        if (error.response && error.response.status === 401) {
          navigate("/");
        } else {
          console.error("Error checking authentication:", error);
          // Optionally show an error message to the user
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchProjects = async () => {
    setProjectsLoading(true); // Start loading projects
    try {
      const response = await axios.get("http://localhost:5050/scenes", {
        withCredentials: true,
      });
      if (response.status === 200) {
        setProjects(response.data);
        console.log("Projects fetched successfully:", response.data);
      } else {
        console.error("Failed to fetch projects:", response);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setProjectsLoading(false); // Stop loading projects, regardless of success/failure
    }
  };

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

  const handleImportButtonClick = () => {
    setImportPanelOpen(!isImportPanelOpen);
    setGeneratePanelOpen(false);
  };

  const handleGenerateButtonClick = () => {
    setGeneratePanelOpen(!isGeneratePanelOpen);
    setImportPanelOpen(false);
  };

  const handleClosePanel = () => {
    setImportPanelOpen(false);
    setGeneratePanelOpen(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("sceneName", file.name.split(".")[0]);
      formData.append("username", username);
      formData.append("sceneFile", file);

      const response = await axios.post(
        "http://localhost:5050/save",
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.status === 200) {
        console.log("File uploaded successfully:", response.data);
        alert("File uploaded and scene created successfully.");
        fetchProjects();
        navigate(`/editor?sceneId=${response.data.sceneId}`);
      } else {
        console.error("File upload failed:", response);
        alert("File upload failed.");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(`Error uploading file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:5050/auth/logout",
        {},
        { withCredentials: true }
      );
      logoutUser();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="home-container">
      <aside className="sidebar-home">
        <div className="profile-section">
          <div className="profile-icon">
            <img style={{ height: "30px" }} src="/cube2.svg" alt="" />
          </div>
          <span>{username}</span>
        </div>
        <nav className="menu">
          <Link to="/" className="menu-item active">
            Home
          </Link>
          <Link to="/myfiles" className="menu-item">
            My Files
          </Link>
          <Link to="/sharedwithme" className="menu-item">
            Shared with Me
          </Link>
          <Link to="/community" className="menu-item">
            Community
          </Link>
          <Link to="/tutorials" className="menu-item">
            Tutorials
          </Link>
          <Link to="/library" className="menu-item">
            Library
          </Link>
          <Link to="/inbox" className="menu-item">
            Inbox
          </Link>
        </nav>
        <div className="upgrade-section">
          <button className="upgrade-button">Upgrade</button>
          <button
            className="upgrade-button"
            onClick={handleLogout}
            style={{ marginTop: "10px" }}
          >
            <FaSignOutAlt style={{ marginRight: "5px" }} />
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="top-bar">
          <h1>Welcome to the 3D space</h1>
          <button className="import-button" onClick={handleImportButtonClick}>
            Import
          </button>
          <button
            className="generate-button"
            onClick={handleGenerateButtonClick}
          >
            Generate
          </button>
        </header>

        {isImportPanelOpen && (
          <div className="import-home">
            <div className="import-panel-header">
              <h2>Import or Drag & Drop</h2>
              <FaTimes className="close-icon" onClick={handleClosePanel} />
            </div>
            <div
              className={`drag-drop-area ${dragOver ? "drag-over" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <p>Drag & Drop files here or choose an option below</p>
            </div>
            <div className="import-options">
              <button
                className="import-option"
                onClick={() => handleFileInput(".gltf,.glb,.stl,.fbx,.obj")}
              >
                3D Model (GLTF, STL, FBX, OBJ)
              </button>
            </div>
          </div>
        )}

        {isGeneratePanelOpen && (
          <div className="import-panel">
            <div className="import-panel-header">
              <h2>Generate</h2>
              <FaTimes className="close-icon" onClick={handleClosePanel} />
            </div>
            <div className="import-options">
              <button
                className="import-option"
                onClick={() => navigate("/2dimageto3dmodel")}
              >
                2D Image to 3D Model
              </button>
              <button
                className="import-option"
                onClick={() => navigate("/polymodel")}
              >
                Polymodel Conversion
              </button>
              <button className="import-option" onClick={() => navigate("#")}>
                Dummy Button 1
              </button>
              <button className="import-option" onClick={() => navigate("#")}>
                Dummy Button 2
              </button>
              <button className="import-option" onClick={() => navigate("#")}>
                Dummy Button 3
              </button>
            </div>
          </div>
        )}

        <section className="projects">
          <h2>Projects</h2>
          <div className="projects-grid">
            <div
              onClick={() => navigate("/editor")}
              className="project-card new-file"
            >
              <FaFileAlt style={{ marginRight: "8px" }} />
              <p>New File</p>
            </div>
            {/* Skeleton Loading */}
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
                  onClick={() =>
                    navigate(`/editor?sceneId=${project.scene_id}`)
                  }
                >
                  <div className="project-thumbnail"></div>
                  <p className="project-title">{project.scene_name}</p>
                  <p>3D Space</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="tutorials">
          <h2>Tutorials</h2>
          <div className="tutorials-grid">
            {/* Placeholder tutorial cards - replace with dynamic content */}
            <div className="tutorial-card">
              <div className="project-thumbnail"></div>
              <p className="project-title">Untitled</p>
              <span className="project-date"></span>
              <p></p>
            </div>
            <div className="tutorial-card">
              <div className="project-thumbnail"></div>
              <p className="project-title">Untitled</p>
              <span className="project-date"></span>
              <p></p>
            </div>
            <div className="tutorial-card">
              <div className="project-thumbnail"></div>
              <p className="project-title">Untitled</p>
              <span className="project-date"></span>
              <p></p>
            </div>
            <div className="tutorial-card">
              <div className="project-thumbnail"></div>
              <p className="project-title">Untitled</p>
              <span className="project-date"></span>
              <p></p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
