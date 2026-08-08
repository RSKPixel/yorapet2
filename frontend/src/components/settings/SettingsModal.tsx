import { useMemo, useState, type ComponentType, type SVGProps } from "react";

import {
  CompanyProfileIcon,
  CogIcon,
  KeyIcon,
  UserCircleIcon,
  UsersIcon,
} from "@/components/forms/formIcons";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { CompanyProfileForm } from "@/components/settings/CompanyProfileForm";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { UsersPanel } from "@/components/settings/UsersPanel";
import { Modal } from "@/components/ui/Modal";
import type { SettingsTabId } from "@/contexts/SettingsContext";
import { useAuth } from "@/hooks/useAuth";

type IconProps = SVGProps<SVGSVGElement>;

type TabDef = {
  id: SettingsTabId;
  label: string;
  icon: ComponentType<IconProps>;
};

type SettingsModalProps = {
  onClose: () => void;
  initialTab?: SettingsTabId;
};

export function SettingsModal({
  onClose,
  initialTab = "general",
}: SettingsModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const tabs = useMemo(() => {
    const items: TabDef[] = [
      { id: "general", label: "General", icon: CogIcon },
      {
        id: "companyProfile",
        label: "Company Profile",
        icon: CompanyProfileIcon,
      },
      { id: "profile", label: "Profile", icon: UserCircleIcon },
      { id: "password", label: "Password", icon: KeyIcon },
    ];
    if (isAdmin) {
      items.push({ id: "users", label: "Users", icon: UsersIcon });
    }
    return items;
  }, [isAdmin]);

  const [activeTab, setActiveTab] = useState<SettingsTabId>(() =>
    tabs.some((tab) => tab.id === initialTab) ? initialTab : "general",
  );

  const resolvedTab =
    activeTab === "users" && !isAdmin ? "general" : activeTab;

  return (
    <Modal
      title="Settings"
      titleIcon={CogIcon}
      onClose={onClose}
      ariaLabelledBy="settings-modal-title"
      className="settings-shell-card"
    >
      <div className="settings-layout">
        <div
          className="settings-tabs"
          role="tablist"
          aria-label="Settings sections"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = resolvedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`settings-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`settings-panel-${tab.id}`}
                className={`settings-tab${active ? " settings-tab-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="settings-tab-icon" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div
          className="settings-panel"
          role="tabpanel"
          id={`settings-panel-${resolvedTab}`}
          aria-labelledby={`settings-tab-${resolvedTab}`}
        >
          <div className="settings-panel-body">
            {resolvedTab === "general" ? <GeneralTab /> : null}
            {resolvedTab === "companyProfile" ? <CompanyProfileForm /> : null}
            {resolvedTab === "profile" ? <ProfileForm /> : null}
            {resolvedTab === "password" ? <ChangePasswordForm /> : null}
            {resolvedTab === "users" && isAdmin ? <UsersPanel /> : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}
