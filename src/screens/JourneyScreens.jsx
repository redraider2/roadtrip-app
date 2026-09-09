import { Fragment } from "react";

function ScreenBoundary({ active = true, children }) {
  return <Fragment>{active ? children ?? null : null}</Fragment>;
}

export function HomeScreen({ active, children }) {
  return <ScreenBoundary active={active}>{children}</ScreenBoundary>;
}

export function ChooseTeamScreen({ active, children }) {
  return <ScreenBoundary active={active}>{children}</ScreenBoundary>;
}

export function ChooseGameScreen({ active, children }) {
  return <ScreenBoundary active={active}>{children}</ScreenBoundary>;
}

export function TripHqScreen({ active, children }) {
  return <ScreenBoundary active={active}>{children}</ScreenBoundary>;
}

export function PlanRouteScheduleScreen({ active, children }) {
  return <ScreenBoundary active={active}>{children}</ScreenBoundary>;
}

export function PlanAlongTheWayScreen({ active, children }) {
  return <ScreenBoundary active={active}>{children}</ScreenBoundary>;
}

export function PlanStayItineraryScreen({ active, children }) {
  return <ScreenBoundary active={active}>{children}</ScreenBoundary>;
}

export function DriveScreen({ active, children }) {
  return <ScreenBoundary active={active}>{children}</ScreenBoundary>;
}

export function GameWeekendScreen({ active, children }) {
  return <ScreenBoundary active={active}>{children}</ScreenBoundary>;
}

export function GameDayScreen({ active, children }) {
  return <ScreenBoundary active={active}>{children}</ScreenBoundary>;
}
