package com.dragolaida.casas;

import android.app.Activity;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.*;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {
  private WebView web;
  private TextToSpeech tts;
  private boolean ttsReady=false;

  @Override public void onCreate(Bundle b){
    super.onCreate(b);
    web=new WebView(this);
    web.setBackgroundColor(0xFF0B0410);
    web.getSettings().setJavaScriptEnabled(true);
    web.getSettings().setDomStorageEnabled(true);
    web.getSettings().setAllowFileAccess(true);
    web.getSettings().setAllowContentAccess(true);
    web.setWebViewClient(new WebViewClient());
    web.setWebChromeClient(new WebChromeClient());
    web.addJavascriptInterface(new TTSBridge(), "AndroidTTS");
    setContentView(web);
    tts=new TextToSpeech(this, status -> {
      ttsReady=(status==TextToSpeech.SUCCESS);
      if(ttsReady){
        tts.setLanguage(new Locale("es","ES"));
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){
          public void onStart(String id){}
          public void onDone(String id){ notifyDone(id,true); }
          @Deprecated public void onError(String id){ notifyDone(id,false); }
          public void onError(String id,int code){ notifyDone(id,false); }
        });
      }
    });
    web.loadUrl("file:///android_asset/index.html");
  }

  private void notifyDone(String id, boolean ok){
    runOnUiThread(() -> web.evaluateJavascript("window.__nativeTtsDone&&window.__nativeTtsDone("+JSONObject.quote(id)+","+(ok?"true":"false")+")", null));
  }

  public class TTSBridge {
    @JavascriptInterface public String getVoices(){
      JSONArray a=new JSONArray();
      try{
        if(tts!=null && ttsReady){
          for(android.speech.tts.Voice v: tts.getVoices()){
            Locale l=v.getLocale();
            if(l!=null && "es".equalsIgnoreCase(l.getLanguage())){
              JSONObject o=new JSONObject();
              o.put("name",v.getName()); o.put("lang",l.toLanguageTag()); o.put("localService",!v.isNetworkConnectionRequired());
              a.put(o);
            }
          }
        }
      }catch(Exception e){}
      return a.toString();
    }
    @JavascriptInterface public void speak(String text,String lang,double rate,double pitch,double volume,String voiceName,String id){
      runOnUiThread(() -> {
        if(!ttsReady){ notifyDone(id,false); return; }
        try{
          if(lang!=null && !lang.isEmpty()) tts.setLanguage(Locale.forLanguageTag(lang));
          if(voiceName!=null && !voiceName.isEmpty()){ for(android.speech.tts.Voice v: tts.getVoices()) if(voiceName.equals(v.getName())){tts.setVoice(v);break;} }
          tts.setSpeechRate((float)Math.max(0.55,Math.min(1.4,rate)));
          tts.setPitch((float)Math.max(0.55,Math.min(1.6,pitch)));
          Bundle params=new Bundle(); params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME,(float)Math.max(0,Math.min(1,volume)));
          tts.speak(text,TextToSpeech.QUEUE_FLUSH,params,id);
        }catch(Exception e){ notifyDone(id,false); }
      });
    }
    @JavascriptInterface public void stop(){ runOnUiThread(() -> { if(tts!=null) tts.stop(); }); }
  }

  @Override public void onBackPressed(){ if(web.canGoBack()) web.goBack(); else super.onBackPressed(); }
  @Override protected void onDestroy(){ if(tts!=null){tts.stop();tts.shutdown();} if(web!=null)web.destroy(); super.onDestroy(); }
}
