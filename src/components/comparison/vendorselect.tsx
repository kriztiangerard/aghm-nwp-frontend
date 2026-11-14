import React, { useId } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VENDOR_NAMES, type PlanTier, type VendorName } from "./types";

interface VendorSelectProps {
  tier: PlanTier;
  selectedVendor: VendorName;
  /** Vendors with a complete plan for this tier. */
  availableVendors: VendorName[];
  onVendorChange: (vendor: VendorName) => void;
}

export const VendorSelect: React.FC<VendorSelectProps> = ({
  tier,
  selectedVendor,
  availableVendors,
  onVendorChange,
}) => {
  const id = useId();

  return (
    <div className="pt-1">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-muted-foreground"
      >
        Vendor
      </label>

      <Select
        value={selectedVendor}
        onValueChange={(value) => onVendorChange(value as VendorName)}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-label={`Vendor for ${tier} plan`}
        >
          <SelectValue placeholder="Choose a vendor..." />
        </SelectTrigger>

        <SelectContent>
          {VENDOR_NAMES.map((vendor) => (
            <SelectItem key={vendor} value={vendor}>
              {vendor}
              {!availableVendors.includes(vendor) && " (Unavailable)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default VendorSelect;