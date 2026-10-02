"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, MapPin, Pencil, Trash2, MoreVertical, Home, Briefcase, Star, ChevronDown, Map, Phone, Mail, Building2, User } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProfileLayoutWrapper from "@/components/ProfileLayoutWrapper";
import AddressModal from "@/components/AddressModal";
import { useAppStore } from "@/store/use-app-store";
import { useCustomerAddresses } from "@/hooks/use-customer-addresses";
import type { CustomerAddress } from "@/api/services/customerAddress";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AddressManagementPage: React.FC = () => {
  const { customer } = useAppStore();
  const [addressModalOpen, setAddressModalOpen] = useState<boolean>(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string>("");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    addresses,
    isLoading: addressLoading,
    error: addressError,
    addAddress,
    updateAddress,
    deleteAddress,
    updateDefaultAddress,
  } = useCustomerAddresses(customer?.id);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId("");
        setSelectedAddressId("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressModalOpen(true);
  };

  const handleEditAddress = (address: CustomerAddress) => {
    setEditingAddress(address);
    setAddressModalOpen(true);
    setOpenMenuId("");
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (window.confirm("Are you sure you want to delete this address?")) {
      try {
        await deleteAddress(addressId);
        setOpenMenuId("");
      } catch (error) {
        console.error("Error deleting address:", error);
      }
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const result = await updateDefaultAddress(addressId);
      setOpenMenuId("");
      if (result) {
        setSuccessMessage("Default address updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (error) {
      console.error("Error setting default address:", error);
      setSuccessMessage("Failed to set default address. Please try again.");
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  };

  const handleShowDetails = (address: CustomerAddress) => {
    setSelectedAddress(address);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedAddress(null);
  };

  /**
   * Opens these coordinates in a consumer map app.
   *
   * A plain website deep link, not a Maps API call - it needs no key and costs nothing.
   * Pointed at OpenStreetMap for consistency with the basemap the rest of the app uses.
   */
  const openInMaps = (latitude: string, longitude: string) => {
    const url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
    window.open(url, "_blank");
  };

  const getAddressIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "home":
        return <Home className="w-5 h-5 text-brand" />;
      case "work":
        return <Briefcase className="w-5 h-5 text-brand" />;
      default:
        return <MapPin className="w-5 h-5 text-brand" />;
    }
  };

  if (addressLoading) {
    return (
      <ProtectedRoute>
        <ProfileLayoutWrapper title="Address Management">
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        </ProfileLayoutWrapper>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <ProfileLayoutWrapper title="Address Management">
        <div>
          {/* Header with Add Button */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-soft text-sm">Manage your delivery addresses</p>
            <button
              onClick={handleAddAddress}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-hover) 100%)" }}
            >
              <Plus className="w-4 h-4" />
              Add New Address
            </button>
          </div>

          {/* Error Message */}
          {addressError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {addressError}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm border ${successMessage.includes("Failed") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
              {successMessage}
            </div>
          )}

          {/* Addresses Grid */}
          {addresses && addresses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {addresses.map((address) => (
                <div
                  key={address._id}
                  className={`relative rounded-xl bg-white flex flex-col min-h-[280px] transition-all duration-200 hover:-translate-y-0.5 ${
                    address.isDefault
                      ? "border-2 border-brand shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                      : "border border-wash shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                  }`}
                >
                  <div className="p-6 flex flex-col flex-1">
                    {/* Address Header */}
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-3">
                        {getAddressIcon(address.type)}
                        <div>
                          <p className="font-semibold text-heading capitalize">{address.type}</p>
                          {address.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-light text-brand text-xs font-medium mt-1">
                              <Star className="w-3 h-3" /> Default
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dropdown Menu */}
                      <div className="relative" ref={openMenuId === address._id ? menuRef : null}>
                        <button
                          onClick={() => {
                            setOpenMenuId(openMenuId === address._id ? "" : address._id);
                            setSelectedAddressId(address._id);
                          }}
                          className="p-1.5 rounded-full text-soft hover:bg-surface hover:text-heading transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === address._id && (
                          <div className="absolute right-0 top-8 z-10 w-44 bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-gray-100 py-1">
                            <button
                              onClick={() => handleEditAddress(address)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-body hover:bg-gray-50 transition-colors"
                            >
                              <Pencil className="w-4 h-4" /> Edit
                            </button>
                            <button
                              onClick={() => handleSetDefaultAddress(address._id)}
                              disabled={address.isDefault}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-body hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                              <Star className="w-4 h-4" />
                              {address.isDefault ? "Already Default" : "Set as Default"}
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address._id)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address Details */}
                    <div className="flex-1 space-y-2">
                      <p className="text-soft text-sm font-medium leading-relaxed">
                        {address.street || "Street address not provided"}
                      </p>
                      <p className="text-soft text-sm leading-relaxed">
                        {address.city && address.state && address.zipCode
                          ? `${address.city}, ${address.state} ${address.zipCode}`
                          : address.city || address.state || address.zipCode || "City, State, Zip Code not provided"}
                      </p>
                      <p className="text-soft text-sm leading-relaxed">
                        {address.country || "Country not provided"}
                      </p>

                      {/* Show More Button */}
                      <div className="mt-auto pt-3">
                        <button
                          onClick={() => handleShowDetails(address)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-line-light text-soft text-xs hover:border-brand hover:text-brand hover:bg-brand-light transition-colors"
                        >
                          <ChevronDown className="w-3 h-3" /> Show More
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-wash shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-center py-12 bg-white">
              <MapPin className="w-12 h-12 text-[#bdc3c7] mx-auto mb-3" />
              <h3 className="text-soft text-lg font-medium mb-1">No addresses found</h3>
              <p className="text-soft text-sm mb-6">Add your first address to get started</p>
              <button
                onClick={handleAddAddress}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-hover) 100%)" }}
              >
                <Plus className="w-4 h-4" /> Add Address
              </button>
            </div>
          )}

          {/* Address Modal */}
          <AddressModal
            open={addressModalOpen}
            onClose={() => {
              setAddressModalOpen(false);
              setEditingAddress(null);
            }}
            onSave={async (addressData) => {
              try {
                if (editingAddress) {
                  await updateAddress(editingAddress._id, addressData);
                } else {
                  await addAddress(addressData);
                }
                setAddressModalOpen(false);
                setEditingAddress(null);
              } catch (error) {
                console.error("Error saving address:", error);
              }
            }}
            initialData={editingAddress || undefined}
          />

          {/* Address Details Dialog */}
          <Dialog open={detailsModalOpen} onOpenChange={(open) => !open && handleCloseDetailsModal()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
              <DialogHeader className="px-6 py-4 border-b border-line-light bg-paper">
                <div className="flex items-center gap-3">
                  {selectedAddress && getAddressIcon(selectedAddress.type)}
                  <div>
                    <DialogTitle className="text-base font-semibold text-heading capitalize">
                      {selectedAddress?.type} Address Details
                    </DialogTitle>
                    {selectedAddress?.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-light text-brand text-xs font-medium mt-1">
                        <Star className="w-3 h-3" /> Default
                      </span>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {selectedAddress && (
                <div className="p-6 space-y-5">
                  {/* Address Information */}
                  <div>
                    <p className="text-soft text-[0.7rem] font-semibold uppercase tracking-wider mb-3">Address Information</p>
                    <div className="flex items-start gap-3 p-3 bg-surface rounded-xl border border-line-light">
                      <MapPin className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-heading text-sm font-medium leading-snug mb-1">{selectedAddress.street}</p>
                        <p className="text-soft text-xs leading-snug mb-1">{selectedAddress.city}, {selectedAddress.state} {selectedAddress.zipCode}</p>
                        <p className="text-soft text-xs leading-snug">{selectedAddress.country}</p>
                      </div>
                    </div>
                  </div>

                  {/* Company Information */}
                  {selectedAddress.companyName && (
                    <div>
                      <p className="text-soft text-[0.7rem] font-semibold uppercase tracking-wider mb-3">Company Information</p>
                      <div className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-line-light">
                        <Building2 className="w-4 h-4 text-brand flex-shrink-0" />
                        <p className="text-heading text-sm font-medium">{selectedAddress.companyName}</p>
                      </div>
                    </div>
                  )}

                  {/* Receiver Information */}
                  <div>
                    <p className="text-soft text-[0.7rem] font-semibold uppercase tracking-wider mb-3">Receiver Information</p>
                    <div className="p-3 bg-surface rounded-xl border border-line-light space-y-3">
                      {selectedAddress.receiverName && (
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-brand flex-shrink-0" />
                          <p className="text-heading text-sm font-medium">{selectedAddress.receiverName}</p>
                        </div>
                      )}
                      {selectedAddress.receiverPhone && (
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-brand flex-shrink-0" />
                          <p className="text-heading text-sm font-medium">
                            {selectedAddress.receiverPhoneCountryCode} {selectedAddress.receiverPhone}
                          </p>
                        </div>
                      )}
                      {selectedAddress.receiverEmail && (
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-brand flex-shrink-0" />
                          <p className="text-heading text-sm font-medium">{selectedAddress.receiverEmail}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location & Coordinates */}
                  {selectedAddress.coordinates && (
                    <div>
                      <p className="text-soft text-[0.7rem] font-semibold uppercase tracking-wider mb-3">Location & Coordinates</p>
                      <div className="p-3 bg-surface rounded-xl border border-line-light">
                        <div className="flex items-start gap-3 mb-3">
                          <Map className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-heading text-xs font-medium mb-1">Latitude: {selectedAddress.coordinates.latitude}</p>
                            <p className="text-heading text-xs font-medium">Longitude: {selectedAddress.coordinates.longitude}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => openInMaps(selectedAddress.coordinates.latitude, selectedAddress.coordinates.longitude)}
                          className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-white text-xs font-medium transition-opacity hover:opacity-90"
                          style={{ background: "linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-hover) 100%)" }}
                        >
                          <Map className="w-3.5 h-3.5" /> Open in Maps
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Additional Information */}
                  <div>
                    <p className="text-soft text-[0.7rem] font-semibold uppercase tracking-wider mb-3">Additional Information</p>
                    <div className="p-3 bg-surface rounded-xl border border-line-light space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-soft text-xs font-medium">Unique ID:</span>
                        <span className="text-heading text-xs font-medium">{selectedAddress.uniqueId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-soft text-xs font-medium">Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedAddress.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {selectedAddress.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-soft text-xs font-medium">Created:</span>
                        <span className="text-heading text-xs font-medium">{new Date(selectedAddress.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-soft text-xs font-medium">Last Updated:</span>
                        <span className="text-heading text-xs font-medium">{new Date(selectedAddress.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="px-6 py-3 border-t border-line-light bg-paper flex justify-end">
                <button
                  onClick={handleCloseDetailsModal}
                  className="px-5 py-2 rounded-xl text-soft text-sm font-medium hover:bg-wash hover:text-heading transition-colors"
                >
                  Close
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </ProfileLayoutWrapper>
    </ProtectedRoute>
  );
};

export default AddressManagementPage;
