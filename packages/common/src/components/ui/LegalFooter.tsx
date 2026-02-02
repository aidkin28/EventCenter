"use client";

import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { HREFLink } from "./HREFLink";
import { cn } from "../../lib/utils";
import useElementStyles from "../../hooks/useElementStyles";
import useComputedStyles from "../../hooks/useComputedStyle";

export interface LegalFooterProps {
  className?: string;
  children?: React.ReactNode;
}

export const LegalFooter = forwardRef<HTMLDivElement, LegalFooterProps>(({ className, children }, ref) => {
  const divContainerRef = useRef<HTMLDivElement>(null);

  const divContainerStyles = useComputedStyles(true, divContainerRef, ["width"], [], 400);
  const width = parseInt(divContainerStyles?.width || "500");
  const makeMultiLine = width < 400;

  return (
    <div
      ref={divContainerRef}
      className={cn("flex w-full items-center justify-between px-4 pb-4 pt-8 text-[10px] lg:px-3", className, makeMultiLine && "flex-col")}
    >
      <span className={cn("text-gray-600 pr-1", makeMultiLine && "pr-0 pb-1")}>
        {process.env.NEXT_PUBLIC_APP_TITLE} trademarks of {process.env.NEXT_PUBLIC_APP_TITLE} Inc. ©{" "}
        {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_TITLE} Inc. All rights reserved.
      </span>
      <div className={cn("flex items-center gap-x-1", makeMultiLine && "w-full justify-between")}>
        <HREFLink
          newTab={true}
          url={`https://${process.env.NEXT_PUBLIC_MARKETING_DOMAIN_NAME}/terms/`}
          className="m-0 border-none p-0 text-lightPurple underline hover:text-darkPurple"
        >
          Terms & Conditions
        </HREFLink>
        <HREFLink
          newTab={true}
          url={`https://${process.env.NEXT_PUBLIC_MARKETING_DOMAIN_NAME}/privacy-policy/`}
          className="m-0 mx-1 border-none p-0 text-lightPurple underline hover:text-darkPurple"
        >
          Privacy Policy
        </HREFLink>
      </div>
    </div>
  );
});
LegalFooter.displayName = "LegalFooter";
