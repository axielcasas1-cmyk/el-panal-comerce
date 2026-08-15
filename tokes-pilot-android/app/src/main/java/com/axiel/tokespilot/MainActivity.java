package com.axiel.tokespilot;

import android.app.Activity;
import android.graphics.Color;
import android.nfc.Ndef;
import android.nfc.NdefFormatable;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity implements NfcAdapter.ReaderCallback {
  private static final String MIME="application/vnd.tokes.lab", PREFIX="TOKES-LAB|";
  private NfcAdapter nfc; private EditText card; private TextView balance,status; private boolean write=false;
  @Override public void onCreate(Bundle b){super.onCreate(b);nfc=NfcAdapter.getDefaultAdapter(this);setContentView(ui());refresh();}
  private ScrollView ui(){ScrollView s=new ScrollView(this); LinearLayout r=new LinearLayout(this);r.setOrientation(LinearLayout.VERTICAL);r.setPadding(36,48,36,48);r.setBackgroundColor(Color.rgb(11,13,16));s.addView(r);
    TextView t=tv("TOKES PILOT",30,Color.WHITE,true);r.addView(t);r.addView(tv("LAB ONLY · NFC DEMO",13,Color.LTGRAY,false));
    card=new EditText(this);card.setText("DEMO-0001");card.setTextColor(Color.WHITE);card.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS);card.setBackgroundColor(Color.rgb(25,30,39));card.setPadding(18,18,18,18);r.addView(card,lp());
    Button c=btn("CREAR / CONSULTAR");c.setOnClickListener(v->refresh());r.addView(c,lp());
    Button add=btn("+10 TOKES");add.setOnClickListener(v->{String id=id();setBal(id,getBal(id)+10);refresh();setStatus("RECARGA +10",Color.rgb(42,72,48));});r.addView(add,lp());
    balance=tv("0 TOKES",38,Color.rgb(244,191,58),true);balance.setGravity(Gravity.CENTER);r.addView(balance,lp());
    Button w=btn("ARMAR ESCRITURA NFC");w.setOnClickListener(v->{write=true;setStatus("ACERCA TARJETA NFC GENÉRICA",Color.rgb(93,72,16));});r.addView(w,lp());
    Button x=btn("MODO LECTURA / VALIDACIÓN");x.setOnClickListener(v->{write=false;setStatus("MODO LECTURA",Color.rgb(34,41,54));});r.addView(x,lp());
    status=tv("LISTO",22,Color.WHITE,true);status.setGravity(Gravity.CENTER);status.setPadding(16,26,16,26);status.setBackgroundColor(Color.rgb(34,41,54));r.addView(status,lp());
    r.addView(tv("Solo escribe un ID TOKES-LAB propio en tarjetas NFC genéricas. Al leer, verde descuenta 1 TOKE ficticio y rojo rechaza. No utiliza credenciales ni formatos de transporte reales.",13,Color.LTGRAY,false),lp());return s;}
  private LinearLayout.LayoutParams lp(){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT);p.setMargins(0,14,0,0);return p;}
  private TextView tv(String v,int z,int c,boolean b){TextView t=new TextView(this);t.setText(v);t.setTextSize(z);t.setTextColor(c);if(b)t.setTypeface(t.getTypeface(),1);return t;}
  private Button btn(String v){Button b=new Button(this);b.setText(v);b.setTextColor(Color.BLACK);b.setBackgroundColor(Color.rgb(244,191,58));return b;}
  private String id(){String x=card.getText().toString().trim().toUpperCase();return x.isEmpty()?"DEMO-0001":x;}
  private int getBal(String id){return getSharedPreferences("tokes",MODE_PRIVATE).getInt("b:"+id,0);} private void setBal(String id,int v){getSharedPreferences("tokes",MODE_PRIVATE).edit().putInt("b:"+id,Math.max(0,v)).apply();}
  private void refresh(){if(balance!=null)balance.setText(getBal(id())+" TOKES");} private void setStatus(String v,int c){runOnUiThread(()->{status.setText(v);status.setBackgroundColor(c);});}
  @Override protected void onResume(){super.onResume();if(nfc!=null)nfc.enableReaderMode(this,this,NfcAdapter.FLAG_READER_NFC_A|NfcAdapter.FLAG_READER_NFC_B|NfcAdapter.FLAG_READER_NFC_F|NfcAdapter.FLAG_READER_NFC_V|NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS,null);} @Override protected void onPause(){super.onPause();if(nfc!=null)nfc.disableReaderMode(this);}
  @Override public void onTagDiscovered(Tag tag){if(write)writeTag(tag,id());else readTag(tag);} 
  private void writeTag(Tag tag,String id){try{NdefMessage m=new NdefMessage(new NdefRecord[]{NdefRecord.createMime(MIME,(PREFIX+id).getBytes(StandardCharsets.UTF_8))});Ndef n=Ndef.get(tag);if(n!=null){n.connect();if(!n.isWritable())throw new Exception("NO ESCRIBIBLE");n.writeNdefMessage(m);n.close();}else{NdefFormatable f=NdefFormatable.get(tag);if(f==null)throw new Exception("NO NDEF");f.connect();f.format(m);f.close();}write=false;setStatus("NFC ESCRITO · "+id,Color.rgb(18,61,39));}catch(Exception e){setStatus("ERROR · "+e.getMessage(),Color.rgb(66,25,29));}}
  private void readTag(Tag tag){try{Ndef n=Ndef.get(tag);if(n==null)throw new Exception("NO NDEF");n.connect();NdefMessage m=n.getNdefMessage();n.close();if(m==null)throw new Exception("VACÍA");String found=null;for(NdefRecord r:m.getRecords()){String type=new String(r.getType(),StandardCharsets.US_ASCII),body=new String(r.getPayload(),StandardCharsets.UTF_8);if(MIME.equals(type)&&body.startsWith(PREFIX)){found=body.substring(PREFIX.length()).trim().toUpperCase();break;}}if(found==null)throw new Exception("NO TOKES-LAB");final String f=found;int b=getBal(f);runOnUiThread(()->card.setText(f));if(b>0){setBal(f,b-1);runOnUiThread(this::refresh);setStatus("GREEN · VALID · "+f,Color.rgb(18,61,39));}else{runOnUiThread(this::refresh);setStatus("RED · SIN TOKES · "+f,Color.rgb(66,25,29));}}catch(Exception e){setStatus("RED · "+e.getMessage(),Color.rgb(66,25,29));}}
}
