import React, { useState, useRef, useEffect } from "react";

export default function ImageUploadModal() {
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [limits, setLimits] = useState({ maxScale: 1, minScale: 1 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [preview, setPreview] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        setImage(img.src);
        setImageSize({ width: img.width, height: img.height });
        calculateScaleLimits(img.width, img.height);
        setPreview(null);
      };
    }
  };

  const calculateScaleLimits = (imgWidth, imgHeight) => {
    const container = containerRef.current;
    if (container) {
      const { offsetWidth: cW, offsetHeight: cH } = container;
      const ratioW = cW / imgWidth;
      const ratioH = cH / imgHeight;
      // minScale to fill the container (no blanks)
      const minScale = Math.max(ratioW, ratioH);
      setLimits({ minScale, maxScale: 3 });
      setScale(minScale);

      const displayWidth = imgWidth * minScale;
      const displayHeight = imgHeight * minScale;
      const posX = (cW - displayWidth) / 2;
      const posY = (cH - displayHeight) / 2;
      setPosition({ x: posX, y: posY });
    }
  };

  const clampPosition = (posX, posY, scaleValue) => {
    const container = containerRef.current;
    if (!container) return { x: posX, y: posY };

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const imgWidth = imageSize.width * scaleValue;
    const imgHeight = imageSize.height * scaleValue;

    let minX, maxX, minY, maxY;

    if (imgWidth <= containerWidth) {
      // center horizontally, no dragging
      minX = maxX = (containerWidth - imgWidth) / 2;
    } else {
      minX = containerWidth - imgWidth;
      maxX = 0;
    }

    if (imgHeight <= containerHeight) {
      // center vertically, no dragging
      minY = maxY = (containerHeight - imgHeight) / 2;
    } else {
      minY = containerHeight - imgHeight;
      maxY = 0;
    }

    const clampedX = Math.min(maxX, Math.max(minX, posX));
    const clampedY = Math.min(maxY, Math.max(minY, posY));

    return { x: clampedX, y: clampedY };
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY / 500;
    zoom(delta);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setDragging(true);
      setStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && dragging) {
      const dx = e.touches[0].clientX - startPos.x;
      const dy = e.touches[0].clientY - startPos.y;
      move(dx, dy);
      setStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;
      move(dx, dy);
      setStartPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const zoom = (delta) => {
    const newScale = Math.min(
      limits.maxScale,
      Math.max(limits.minScale, scale + delta)
    );

    const { x: clampedX, y: clampedY } = clampPosition(
      position.x,
      position.y,
      newScale
    );

    setScale(newScale);
    setPosition({ x: clampedX, y: clampedY });
  };

  const move = (dx, dy) => {
    const { x: clampedX, y: clampedY } = clampPosition(
      position.x + dx,
      position.y + dy,
      scale
    );
    setPosition({ x: clampedX, y: clampedY });
  };

  const handleSubmit = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");

    const img = imageRef.current;
    const container = containerRef.current;

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    const imgWidth = imageSize.width;
    const imgHeight = imageSize.height;
    const displayWidth = imgWidth * scale;
    const displayHeight = imgHeight * scale;

    const offsetX = (displayWidth - containerWidth) / 2 - position.x;
    const offsetY = (displayHeight - containerHeight) / 2 - position.y;

    const sx = (offsetX + (containerWidth - 300) / 2) / scale;
    const sy = (offsetY + (containerHeight - 300) / 2) / scale;
    const sw = 300 / scale;
    const sh = 300 / scale;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 300, 300);

    const dataUrl = canvas.toDataURL("image/png");
    setPreview(dataUrl);

    canvas.toBlob((blob) => {
      const formData = new FormData();
      formData.append("avatar", blob, "avatar.png");
      // TODO: send formData to server here
    }, "image/png");
  };

  useEffect(() => {
    const handleTouchEnd = () => setDragging(false);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>Upload Avatar</button>
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 8,
              maxWidth: "90vw",
              textAlign: "center",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button
              style={{ marginBottom: 10 }}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Image
            </button>
            <div
              ref={containerRef}
              style={{
                width: 300,
                height: 300,
                borderRadius: "50%",
                overflow: "hidden",
                margin: "20px auto",
                border: "1px solid #ccc",
                position: "relative",
                touchAction: "none",
                cursor: dragging ? "grabbing" : "grab",
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              {image && (
                <img
                  ref={imageRef}
                  src={image}
                  alt="Avatar Preview"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: "top left",
                    userSelect: "none",
                    pointerEvents: "none",
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                  draggable={false}
                />
              )}
            </div>
            {image && <button onClick={handleSubmit}>Crop & Upload</button>}
            {/* {preview && (
              <div style={{ marginTop: 20 }}>
                <h4>Preview</h4>
                <img
                  src={preview}
                  alt="Cropped Preview"
                  style={{ width: 150, height: 150, borderRadius: "50%" }}
                />
              </div>
            )} */}
          </div>
        </div>
      )}
    </div>
  );
}
