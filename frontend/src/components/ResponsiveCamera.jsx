import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";

export default function ResponsiveCamera({
  position,
  desktopFov = 38,
  mobileHorizontalFov = 51,
}) {
  const { size } = useThree();
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia("(max-width: 639px)").matches,
  );

  useEffect(() => {
    const mobileBreakpoint = window.matchMedia("(max-width: 639px)");
    const updateViewport = (event) => setIsMobile(event.matches);
    mobileBreakpoint.addEventListener("change", updateViewport);
    return () => mobileBreakpoint.removeEventListener("change", updateViewport);
  }, []);

  const mobileFov =
    (360 / Math.PI) *
    Math.atan(
      Math.tan((mobileHorizontalFov * Math.PI) / 360) *
        (size.height / size.width),
    );

  return (
    <PerspectiveCamera
      makeDefault
      position={position}
      fov={isMobile ? mobileFov : desktopFov}
      near={0.1}
      far={100}
    />
  );
}
