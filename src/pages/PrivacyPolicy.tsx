import { PageHeader } from '@/components/PageHeader';
import { Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy() {
  const lastUpdated = 'January 29, 2025';

  return (
    <div className="min-h-screen bg-background pb-8">
      <PageHeader 
        title="Privacy Policy" 
        icon={<Shield className="h-5 w-5 text-primary" />}
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          Last updated: {lastUpdated}
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Introduction</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              Barkeeply ("we," "our," or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you use our mobile application.
            </p>
            <p>
              Please read this privacy policy carefully. If you do not agree with the 
              terms of this privacy policy, please do not access the application.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <div>
              <h4 className="font-medium text-foreground mb-2">Account Information</h4>
              <p>
                When you create an account, we collect your email address and password 
                (stored securely using industry-standard encryption). You may optionally 
                provide a display name, username, bio, and profile photo.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Drink Logging Data</h4>
              <p>
                We collect information about the drinks you log, including: drink name, 
                type/category, brand, rating, tasting notes, location, price, and photos 
                you choose to upload. This data is stored to provide you with your 
                personal drink journal.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Collections & Wishlists</h4>
              <p>
                We store the collections you create and drinks you add to your wishlist 
                to help you organize and track beverages you want to try.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Usage Analytics</h4>
              <p>
                If you opt-in, we collect anonymous usage data including page views, 
                feature usage, and error reports to improve the app experience. This 
                can be disabled in Settings.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Device Information</h4>
              <p>
                We may collect device type, operating system, screen size, and timezone 
                to optimize your experience and troubleshoot issues.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-2">
              <li>To provide and maintain your drink journal</li>
              <li>To enable account creation and authentication</li>
              <li>To sync your data across devices</li>
              <li>To enable social features like following other users and sharing collections</li>
              <li>To improve and personalize your experience</li>
              <li>To respond to support requests</li>
              <li>To detect and prevent fraud or abuse</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Storage & Security</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              Your data is stored securely using industry-standard encryption and 
              hosted on secure cloud infrastructure. We implement appropriate technical 
              and organizational measures to protect your personal information.
            </p>
            <p>
              Your password is hashed and never stored in plain text. All data 
              transmission uses HTTPS encryption.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Sharing</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              We do not sell, trade, or rent your personal information to third parties.
            </p>
            <p>
              Your drink data and profile are private by default. If you choose to 
              make your profile public or share collections, that information becomes 
              visible to other users as configured in your privacy settings.
            </p>
            <p>
              We may share anonymized, aggregated data for analytics purposes that 
              cannot be used to identify you.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Privacy Controls</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-2">
              <li>Control profile visibility (public/private) in Settings</li>
              <li>Control activity feed visibility (public/followers/private)</li>
              <li>Opt-out of analytics collection in Settings</li>
              <li>Delete individual drinks or your entire account</li>
              <li>Export your data upon request</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              We retain your data for as long as your account is active. If you delete 
              your account, your personal data will be permanently deleted within 30 days, 
              except where we are required to retain it for legal purposes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Barkeeply is intended for users who are of legal drinking age in their 
              jurisdiction. We do not knowingly collect personal information from 
              anyone under the legal drinking age. If we learn we have collected such 
              information, we will delete it immediately.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              We may update this privacy policy from time to time. We will notify you 
              of any changes by posting the new policy on this page and updating the 
              "Last updated" date.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              If you have questions about this Privacy Policy or our data practices, 
              please contact us through the bug report feature in the app or email us 
              at privacy@barkeeply.app.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
