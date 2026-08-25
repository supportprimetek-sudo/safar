package app.safar.admin;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            Window window = getWindow();
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#11151D"));
            window.setNavigationBarColor(Color.parseColor("#11151D"));

            WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(false); // false = BRIGHT WHITE ICONS
            controller.setAppearanceLightNavigationBars(false);
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        }
    }
}
