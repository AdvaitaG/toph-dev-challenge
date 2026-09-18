import Image from "next/image";

type IconProps = { size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" };
function icon(asset: string) {
  return function DesignIcon({ size = 16, className }: IconProps) {
    return <Image src={`/design/figma/${asset}.svg`} alt="" width={size} height={size} className={className} unoptimized aria-hidden="true" style={{ flexShrink: 0 }} />;
  };
}
export const ArrowLeftRight = icon("imgArrowRightLeft");
export const AudioLines = icon("imgAudioLines");
export const CalendarDays = icon("imgCalendar");
export const CalendarMetric = icon("imgCalendar1");
export const ChartNoAxesCombined = icon("imgChartLine");
export const ChartPie = icon("imgChartPie");
export const ClipboardCheck = icon("imgBookCheck");
export const Files = icon("imgFiles");
export const Handshake = icon("imgHandshake");
export const Inbox = icon("imgInbox");
export const LogOut = icon("imgLogOut");
export const Mail = icon("imgMail");
export const Map = icon("imgMap");
export const Settings = icon("imgCog");
export const UserRoundCog = icon("imgUserStar");
export const UsersRound = icon("imgUsers");
export const ClipboardPen = icon("imgClipboardPen");
export const Percent = icon("imgPercent");
export const Search = icon("imgSearch");
export const Play = icon("imgPlay");
export const Star = icon("imgStar");
export const Expand = icon("imgExpand");
export const ListFilter = icon("imgListFilter");
export const Funnel = icon("imgFunnel");
