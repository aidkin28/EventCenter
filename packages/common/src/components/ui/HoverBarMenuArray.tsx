"use client";

import { getElemSizeULByRef, useItemSizeUL } from "../../hooks/useItemSizeUL";
import { cn } from "../../lib/utils";
import React, { ReactElement, RefObject, forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, ButtonProps } from "./Button";
import useMousePosition from "../../hooks/useMousePosition";
import { ChevronsUpDown as ElevatorSharp } from "lucide-react";
import { sumElements } from "../../utils/objectManipulation";
import { getEventsClosestToRefSide } from "../../utils/mouseEvents";
import { TabsTrigger } from "./Tabs";

export interface HoverBarMenuArrayProps extends ButtonProps {
  onClick?: any;
  components?: (ReactElement | string | null)[];
  className?: string;
  componentsContainerClassName?: string;
  buttonClassName?: string;
  underlineAnimation?: boolean;
  allowUnselection?: boolean;
  defaultTabIndex?: number;
  disableFocusUnderline?: boolean;
  tabIndex?: number;
  menuBarItemTitles?: string[] | undefined;
  titleQuantities?: number[] | undefined;
  hideNegativeQuantities?: boolean | undefined;
  menuBarItemIsTabTrigger?: boolean;
  onTabClick?: (e: any, index: number) => void;
  rightJSX?: React.ReactNode;
  activeItemClassName?: string;
  inactiveItemClassName?: string;
}

export const HoverBarMenuArray = forwardRef<HTMLDivElement, HoverBarMenuArrayProps>(
  (
    {
      defaultTabIndex,
      className,
      componentsContainerClassName,
      buttonClassName,
      components,
      onClick,
      underlineAnimation = true,
      allowUnselection = false,
      disableFocusUnderline = false,
      tabIndex = undefined,
      menuBarItemTitles = [],
      titleQuantities = [],
      hideNegativeQuantities = false,
      menuBarItemIsTabTrigger = false,
      onTabClick,
      rightJSX,
      activeItemClassName,
      inactiveItemClassName,
      ...props
    },
    ref
  ) => {
    const parentRef = useRef<HTMLDivElement>(null);
    const [componentsFiltered, setComponentsFiltered] = useState<(ReactElement | string | null)[]>(components ?? menuBarItemTitles);
    const [menuItemFocused, setMenuItemFocused] = useState<number | null>(defaultTabIndex ?? null);
    const [menuPreviouslyFocused, setMenuPreviouslyFocused] = useState<number | null>(defaultTabIndex ?? null);
    const [menuItemHovered, setMenuItemHovered] = useState<number | null>(null);
    const [menuItemHoveredLeft, setMenuItemHoveredLeft] = useState<string>("0px");
    const [menuItemHoveredWidth, setMenuItemHoveredWidth] = useState<string>("0px");
    const [menuPreviouslyHovered, setMenuPreviouslyHovered] = useState<number | null>(null);
    const [hoveredAnimation, setHoveredAnimation] = useState<string>("");
    const [focusedAnimation, setFocusedAnimation] = useState<string>("");
    const [sideClosest, setSideClosest] = useState<string>("");
    const [menuHoveredParkedAtFocused, setMenuHoveredParkedAtFocused] = useState<boolean>(false);
    const [isSelected, setIsSelected] = useState<boolean>(false);
    const [previousMousePosition, setPreviousMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [lastMousePositionTime, setLastMousePositionTime] = useState<number>(0);
    const [widthOfMenuBarItems, setWidthOfMenuBarItems] = useState<number[]>([]);
    const [paddingAddedPerItem, setPaddingAddedPerItem] = useState<number>(0);
    const [handlingOutAnimation, setHandlingOutAnimation] = useState<boolean>(false);

    const refsArray: React.RefObject<RefObject<HTMLDivElement | null>[]> = useRef(
      componentsFiltered
        ? componentsFiltered?.map(() => React.createRef<HTMLDivElement>())
        : menuBarItemTitles?.map(() => React.createRef<HTMLDivElement>())
    );

    //give bias towards using x-axis animations
    const preferXAxisMultiplier = 2;

    const menuHoveredTransitionDuration = 300;
    const menuHoveredAnimationDuration = 500;

    const { upperLeftPosition: parentDivXY, width, height } = useItemSizeUL(parentRef, true);

    useEffect(() => {
      if (!components) return;
      const cFiltered = components?.filter((component: any) => component !== null);
      setComponentsFiltered(cFiltered);
    }, [components]);

    useEffect(() => {
      if (tabIndex !== undefined && tabIndex !== null) {
        setMenuItemFocused(tabIndex);
      }
    }, [tabIndex]);

    useEffect(() => {
      ////console.log("parentDivXY", parentDivXY);
      const arrayOfWidths: number[] = [];
      //go over all element refs and save their width in an array
      refsArray.current.forEach((elementRef, index) => {
        const { upperLeftPosition: XY, width: itemWidth, height: itemHeight } = getElemSizeULByRef(elementRef);
        if (XY && itemWidth && itemHeight) {
          arrayOfWidths.push(itemWidth);
        }
      });
      //amount of padding between items that need to be accounted for
      const padding = width - sumElements(arrayOfWidths);
      //divide the padding evenly between all items
      const paddingPerItem = padding / componentsFiltered.length;
      //add the padding to each item
      const arrayOfWidthsWithPadding = arrayOfWidths.map((width) => Math.round(width + paddingPerItem));
      ////console.log("arrayOfWidthsWithPadding", arrayOfWidthsWithPadding);
      setPaddingAddedPerItem(Math.round(paddingPerItem));
      setWidthOfMenuBarItems(arrayOfWidthsWithPadding);
    }, [refsArray, parentDivXY, width]);

    useEffect(() => {
      //console.log("disableFocusUnderline", disableFocusUnderline);
      //console.log("menuPreviouslyFocused", menuPreviouslyFocused);
      //console.log("menuItemFocused", menuItemFocused);
      if (disableFocusUnderline) {
        //console.log("wtf1");
        setMenuPreviouslyFocused(menuItemFocused);
        setMenuItemFocused(null);
        return;
      } else {
        setMenuItemFocused(menuPreviouslyFocused);
        return;
      }
    }, [disableFocusUnderline]);

    const setMenuItemHoveredPosition = (idx?: number | null, idxPrev?: number | null) => {
      if (idx === undefined) idx = menuItemHovered;
      if (idxPrev === undefined) idxPrev = menuPreviouslyHovered;
      setMenuItemHoveredLeft(
        idx !== null || handlingOutAnimation
          ? `${
              sumElements(widthOfMenuBarItems, (idx === null ? (idxPrev === null ? 0 : idxPrev) : idx) - 1) +
              4 +
              (idx === null ? (idxPrev === null ? 0 : idxPrev) : idx) * 0.5
            }px`
          : ""
      );
      setMenuItemHoveredWidth(
        idx !== null || handlingOutAnimation
          ? `${widthOfMenuBarItems[idx === null ? (idxPrev === null ? 0 : idxPrev) : idx] - paddingAddedPerItem - 8}px`
          : "0px"
      );
    };

    // Called when mouse leaves the entire menu bar area, or when hovering over a focused item already
    const handleMenuItemExitHoverAnimation = (e?: any) => {
      //console.log("handlingOutAnimation", handlingOutAnimation);
      //an item is not hovered
      //console.log("menuItemHovered", menuItemHovered);
      //console.log("menuItemFocused", menuItemFocused);
      //console.log("menuPreviouslyHovered", menuPreviouslyHovered);

      if (handlingOutAnimation || menuItemHovered === null) return;
      if (menuItemHovered !== null) {
        //console.log("valid animation too handle", handlingOutAnimation);
        setHandlingOutAnimation(true);
        setMenuItemHovered(null);
        //an item was hovered, but now its not
        //lets animate it out
        let side = "bottom";
        if (e) {
          //get the side closest to the mouse
          side = getEventsClosestToRefSide(e, parentRef, undefined, preferXAxisMultiplier);
        }

        switch (side) {
          case "left":
            setHoveredAnimation("moveOutLeft");
            break;
          case "right":
            setHoveredAnimation("moveOutRight");
            break;
          case "top":
            setHoveredAnimation("moveOutTop");
            break;
          case "bottom":
            setHoveredAnimation("moveOutBottom");
            break;
          default:
            break;
        }

        setTimeout(() => {
          setMenuPreviouslyHovered(null);
          setHoveredAnimation("");
          setHandlingOutAnimation(false);
        }, menuHoveredAnimationDuration);
      } else {
        setMenuItemHovered(null);
        setMenuPreviouslyHovered(null);
        setHoveredAnimation("");
        setHandlingOutAnimation(false);
      }
    };

    //menuItemHovered - UseEffect
    //For hover bar transitions the MenuItemHovered must be a number or null (for fade away), and not undefined
    //Using the MenuItemHovered we call setMenuItemHoveredPosition to set the position of the hovered item
    //with setMenuItemHoveredPosition we can then set setMenuItemHovered(null); to have it fade away
    useEffect(() => {
      //console.log("menuItemHovered99", menuItemHovered);
      //console.log("menuItemFocused", menuItemFocused);
      //console.log("menuHoveredParkedAtFocused", menuHoveredParkedAtFocused);
      if (menuItemHovered === null) return;
      if (menuItemHovered === menuItemFocused) {
        if (menuHoveredParkedAtFocused) {
          setMenuItemHovered(null);
          return;
        }
        setMenuHoveredParkedAtFocused(true);
        setMenuPreviouslyHovered(null);
        setMenuItemHovered(null);
        handleMenuItemExitHoverAnimation();
        return;
      } else {
        setMenuHoveredParkedAtFocused(false);
      }

      // we have a valid menu bar item hovered, how do we animate it?
      if (menuPreviouslyHovered === null && menuItemHovered >= 0 && menuItemHovered < componentsFiltered.length) {
        //its a fresh hover, what animation relative to cursor previous position
        //which axis is the mouse moving on the most?
        switch (sideClosest) {
          case "left":
            setHoveredAnimation("moveInLeft");
            break;
          case "right":
            setHoveredAnimation("moveInRight");

            break;
          case "top":
            setHoveredAnimation("moveInTop");

            break;
          case "bottom":
            setHoveredAnimation("moveInBottom");
            break;
          default:
            break;
        }
      } else {
        setHoveredAnimation("");
      }

      // Set the position of item hovered
      setMenuItemHoveredPosition();

      setMenuPreviouslyHovered(menuItemHovered);
    }, [menuItemHovered]);

    const handleMenuClick = (e: any, idx: number) => {
      //debugger;
      //console.log("clicked", idx);
      ////console.log("sumElements(widthOfMenuBarItems, idx - 1)", sumElements(widthOfMenuBarItems, idx - 1));
      ////console.log("x", parentDivXY.x + sumElements(widthOfMenuBarItems, idx - 1) + 4);
      if (menuItemFocused === idx) {
        //unselect
        if (allowUnselection) {
          setMenuItemFocused(null);
          onClick && onClick(e, idx);
        }
        return;
      }
      //if current focused item is undefined, dont save it as the previously focused item
      if (menuItemFocused !== null && menuItemFocused !== undefined)
        //console.log("wtf2");
        setMenuPreviouslyFocused(allowUnselection ? (menuItemFocused === null ? null : menuItemFocused) : menuItemFocused);

      setMenuItemFocused(idx);

      onClick && onClick(e, idx);
    };

    const handleMenuHover = (event: any, idx: number) => {
      if (idx === menuItemHovered) return;
      //console.log("NEW HOVER", idx);
      setSideClosest(getEventsClosestToRefSide(event, refsArray.current, idx, preferXAxisMultiplier));
      setMenuItemHovered(idx);
    };

    const handleMenuHoverExit = (event: any, idx?: number) => {
      //console.log("EXIT HOVER", idx);
      handleMenuItemExitHoverAnimation(event);
    };

    return (
      <div ref={ref} className={cn("w-fit", className)} onMouseLeave={handleMenuHoverExit}>
        <div ref={parentRef} className={cn("flex w-fit gap-x-1", componentsContainerClassName)}>
          {menuBarItemTitles && menuBarItemTitles.length > 0
            ? menuBarItemTitles.map((title, index) => {
                const elementRef = refsArray.current[index];

                const jsx = (
                  <div
                    key={"parentDiv" + index}
                    ref={elementRef}
                    className={cn(
                      menuItemFocused !== null && menuItemFocused === index
                        ? cn("text-darkPurple", activeItemClassName)
                        : cn("text-secondary-dark", inactiveItemClassName),
                      "rounded-lg"
                    )}
                    onClick={(e) => {
                      handleMenuClick(e, index);
                    }}
                    onMouseOver={(e) => handleMenuHover(e, index)}
                  >
                    <Button
                      key={title}
                      variant="ghost"
                      size="md"
                      className={cn("group flex max-h-[40px] gap-x-2", { "text-darkPurple dark:text-primary-dark": index === menuItemFocused }, buttonClassName)}
                    >
                      <div className="flex w-full items-center justify-between gap-x-2">
                        <span className="flex-grow text-center">{title}</span>
                        {/* If you need to show count badges, you'll need to pass that data as a prop */}
                        {titleQuantities[index] !== undefined && (!hideNegativeQuantities || titleQuantities[index] >= 0) && (
                          <div
                            className={cn("flex h-8 w-8 items-center justify-center rounded-full bg-secondary-light group-hover:bg-taupeGrayFaint", {
                              "bg-faintPurple": index === menuItemFocused,
                            })}
                          >
                            <span className="">{titleQuantities[index]}</span>
                          </div>
                        )}
                      </div>
                    </Button>
                  </div>
                );
                if (menuBarItemIsTabTrigger) {
                  return (
                    <TabsTrigger
                      variant="blank"
                      asChild
                      key={title}
                      value={title}
                      className=""
                      onClick={(e: any) => {
                        console.log("clicked", title, index);
                        onTabClick && onTabClick(e, index);
                      }}
                    >
                      {jsx}
                    </TabsTrigger>
                  );
                }
                return jsx;
              })
            : componentsFiltered.map((component, index) => {
                if (!component) return null;
                const isButton =
                  (typeof component !== "string" && (component.type as any).render?.displayName?.toLowerCase().includes("button")) ??
                  "Button" === "Button";
                const elementRef = refsArray.current[index];

                return (
                  <div
                    key={"parentDiv" + index}
                    ref={elementRef}
                    className={cn(
                      menuItemFocused !== null && menuItemFocused === index
                        ? cn("text-darkPurple", activeItemClassName)
                        : cn("text-secondary-dark", inactiveItemClassName),
                      "rounded-lg"
                    )}
                    onClick={(e) => {
                      handleMenuClick(e, index);
                    }}
                    onMouseOver={(e) => handleMenuHover(e, index)}
                  >
                    {isButton ? (
                      component
                    ) : (
                      <Button key={"Button-" + index} variant="ghost" size="full" underlineAnimation={false} className={buttonClassName}>
                        <span>{component}</span>
                      </Button>
                    )}
                  </div>
                );
              })}
        </div>
        {underlineAnimation && (
          <div
            style={{
              position: "relative",
              //left: `${parentDivXY.x}px`,
              //top: `${parentDivXY.y}px`,
              width: `${width}px`,
              //height: `${height}px`,
            }}
            //Getting weird styling mismatch between local and production, mt-[10px] to increase gap to fix
            className={cn("pointer-events-none mt-[8px] h-1", {
              "overflow-y-hidden overflow-x-visible": hoveredAnimation === "moveOutBottom" || hoveredAnimation === "moveInBottom",
            })}
          >
            <div
              // The hovered underline
              style={{
                left: menuItemHoveredLeft,
                //top: `${parentDivXY.y + height - 2}px`,
                width: menuItemHoveredWidth,
                //height: "4px",
                opacity: menuItemHovered === null ? 0 : 1,
                animationDuration: `${menuHoveredAnimationDuration}ms`,
                transitionDuration: `${menuHoveredTransitionDuration}ms`,
              }}
              className={cn(
                "absolute h-full rounded-t-full bg-taupeGrayLight transition-all",
                {
                  "animate-slideInFromTop duration-200": hoveredAnimation === "moveInTop",
                  "animate-slideInFromBottom duration-200": hoveredAnimation === "moveInBottom",
                  "animate-slideInFromRight duration-300": hoveredAnimation === "moveInRight",
                  "animate-slideInFromLeft duration-300": hoveredAnimation === "moveInLeft",
                  "animate-slideOutToRight duration-200": hoveredAnimation === "moveOutRight",
                  "animate-slideOutToLeft duration-200": hoveredAnimation === "moveOutLeft",
                  "animate-slideOutToTop duration-200": hoveredAnimation === "moveOutTop",
                  "animate-slideOutToBottom duration-200": hoveredAnimation === "moveOutBottom",
                  "animate-fadeOut": handlingOutAnimation,
                  //"animate-fadeOut": isSelected,
                },
                "pointer-events-none"
              )}
            />

            <div
              // The focused underline
              style={{
                left: menuItemFocused !== null ? `${sumElements(widthOfMenuBarItems, menuItemFocused - 1) + 4 + menuItemFocused * 0.5}px` : "",
                //top: `${parentDivXY.y + height - 2}px`,
                width: menuItemFocused !== null ? `${widthOfMenuBarItems[menuItemFocused] - paddingAddedPerItem - 8}px` : "",
                opacity: menuItemFocused !== null ? 1 : 0,
                animationDuration: "100ms",
                transitionDuration: "240ms",
              }}
              className={cn(
                "absolute h-full rounded-t-full bg-charcoalBlue transition-all",
                {
                  "animate-slideInFromTop duration-200": focusedAnimation === "moveInTop",
                  "animate-slideInFromBottom duration-200": focusedAnimation === "moveInBottom",
                  "animate-slideOutToTop": focusedAnimation === "moveOutTop",
                  "animate-slideOutToBottom": focusedAnimation === "moveOutBottom",
                },
                "pointer-events-none"
              )}
            />
          </div>
        )}
      </div>
    );
  }
);

HoverBarMenuArray.displayName = "HoverBarMenuArray";
