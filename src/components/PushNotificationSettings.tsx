import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const PushNotificationSettings = () => {
  const { isSupported, isSubscribed, isLoading, subscribeToPush, unsubscribeFromPush } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <span>Notifications Push</span>
          </CardTitle>
          <CardDescription>
            Les notifications push ne sont pas supportées par ce navigateur
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await subscribeToPush();
    } else {
      await unsubscribeFromPush();
    }
  };

  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <span>Notifications Push</span>
        </CardTitle>
        <CardDescription>
          Recevez des notifications en temps réel sur l'état de vos clients
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor="push-notifications" className="flex flex-col space-y-1">
            <span className="font-medium">Activer les notifications</span>
            <span className="text-sm font-normal text-muted-foreground">
              {isSubscribed 
                ? "Vous recevez actuellement des notifications" 
                : "Activez pour recevoir les mises à jour"}
            </span>
          </Label>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
};
