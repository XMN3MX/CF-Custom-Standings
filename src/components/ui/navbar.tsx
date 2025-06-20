import React from "react";
import ModeToggle from "../mode-toggle";
import { Trophy } from "lucide-react";

function Navbar() {
  return (
    <div className="flex items-center py-3 justify-between sticky top-0 left-0 bg-background">
      <div className="flex items-center justify-center gap-1">
        <Trophy className="text-yellow-500 size-5" />
        <h1 className="font-bold text-xl">Contest Standings</h1>
      </div>
      <div>
        <ModeToggle />
      </div>
    </div>
  );
}

export default Navbar;
