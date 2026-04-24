from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
from yahooquery import Ticker
from sklearn.preprocessing import MinMaxScaler
from sklearn.ensemble import RandomForestRegressor
from keras.models import load_model, Sequential
from keras.layers import LSTM, Dense
import os

app = Flask(__name__)

# ====== LSTM MODEL INITIALIZATION ======
model = None
def get_model():
    global model
    if model is not None:
        return model
        
    try:
        # Attempt 1: Standard Keras model loading
        model = load_model('keras_model.h5')
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Standard model loading failed: {str(e)}")
        
        try:
            # Attempt 2: Load with custom LSTM object
            model = load_model('keras_model.h5', 
                             compile=False,
                             custom_objects={'LSTM': LSTM})
            print("Model loaded with custom LSTM configuration!")
        except Exception as e:
            print(f"Custom loading failed: {str(e)}")
            
            try:
                # Attempt 3: Manually recreate architecture and load weights
                model = Sequential([
                    LSTM(units=50, return_sequences=True, input_shape=(100, 1)),
                    LSTM(units=50, return_sequences=False),
                    Dense(units=25),
                    Dense(units=1)
                ])
                
                # Load weights only
                model.load_weights('keras_model.h5')
                print("Successfully loaded weights into recreated architecture!")
            except Exception as e:
                print(f"Final loading attempt failed: {str(e)}")
                return None
    return model

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        ticker = data.get('ticker', 'AAPL')
        
        model = get_model()
        if model is None:
            return jsonify({'error': 'Failed to load the prediction model.'}), 500

        import datetime
        end_date = datetime.date.today().strftime('%Y-%m-%d')
        
        # Fetch historical stock data via yahooquery API
        t = Ticker(ticker)
        df = t.history(start='2012-01-01', end=end_date)
        
        if df.empty or isinstance(df, dict):
            return jsonify({'error': 'No data found for this ticker symbol.'}), 404
            
        # Process and format the returned DataFrame
        df = df.reset_index()
        df.set_index('date', inplace=True)
        df.index = pd.to_datetime(df.index)
        df.sort_index(inplace=True)
            
        # Preprocessing
        if 'close' not in df.columns:
            return jsonify({'error': 'Close price data not found.'}), 500
            
        close_data = df[['close']]
        dataset = close_data.values
        scaler = MinMaxScaler(feature_range=(0,1))
        scaled_data = scaler.fit_transform(dataset)

        # Create training set (70% of data)
        training_size = int(len(scaled_data) * 0.7)
        train_data = scaled_data[0:training_size, :]

        # Prepare test data (last 30% with 100-day lookback)
        test_data = scaled_data[training_size - 100:, :]
        
        # Create x_test and y_test
        x_test = []
        y_test = dataset[training_size:]
        
        for i in range(100, len(test_data)):
            x_test.append(test_data[i-100:i, 0])
        
        x_test = np.array(x_test)
        x_test = np.reshape(x_test, (x_test.shape[0], x_test.shape[1], 1))

        # Create x_train and y_train for the Ensemble Model
        x_train = []
        y_train = []
        for i in range(100, len(train_data)):
            x_train.append(train_data[i-100:i, 0])
            y_train.append(train_data[i, 0])
            
        x_train, y_train = np.array(x_train), np.array(y_train)
        
        # Train Random Forest Regressor dynamically for this specific ticker
        rf_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        rf_model.fit(x_train, y_train)

        # Make LSTM predictions
        lstm_predictions = model.predict(x_test)
        lstm_predictions = scaler.inverse_transform(lstm_predictions)
        
        # Make Random Forest predictions
        rf_x_test = x_test.reshape((x_test.shape[0], x_test.shape[1]))
        rf_predictions = rf_model.predict(rf_x_test)
        rf_predictions = rf_predictions.reshape(-1, 1)
        rf_predictions = scaler.inverse_transform(rf_predictions)
        
        # Ensemble: Average the predictions for better accuracy
        predictions = (lstm_predictions + rf_predictions) / 2.0
        
        # Calculate RMSE
        rmse = np.sqrt(np.mean(predictions - y_test)**2)
        
        # Format dates for JSON
        dates = df.index.strftime('%Y-%m-%d').tolist()
        historical_prices = dataset.flatten().tolist()
        
        test_dates = df.index[training_size:].strftime('%Y-%m-%d').tolist()
        predicted_prices = predictions.flatten().tolist()
        actual_test_prices = y_test.flatten().tolist()
        
        # Generate predictions across the entire historical dataset for performance analysis
        x_all = []
        for i in range(100, len(scaled_data)):
            x_all.append(scaled_data[i-100:i, 0])
        x_all = np.array(x_all)
        x_all = np.reshape(x_all, (x_all.shape[0], x_all.shape[1], 1))
        
        # LSTM predictions for all data
        lstm_all_predictions = model.predict(x_all)
        lstm_all_predictions = scaler.inverse_transform(lstm_all_predictions)
        
        # Random Forest predictions for all data
        rf_x_all = x_all.reshape((x_all.shape[0], x_all.shape[1]))
        rf_all_predictions = rf_model.predict(rf_x_all)
        rf_all_predictions = rf_all_predictions.reshape(-1, 1)
        rf_all_predictions = scaler.inverse_transform(rf_all_predictions)
        
        # Final ensemble predictions for all data
        all_predictions = (lstm_all_predictions + rf_all_predictions) / 2.0
        
        analysis_df = pd.DataFrame(index=df.index[100:])
        analysis_df['Actual'] = dataset[100:].flatten()
        analysis_df['Predicted'] = all_predictions.flatten()
        
        def calculate_accuracy(actual, predicted):
            if actual == 0:
                return 0
            return max(0, 100 - (abs(actual - predicted) / actual) * 100)
            
        # Calculate 5-year average performance (Year-wise)
        analysis_df['Year'] = analysis_df.index.year
        yearly_df = analysis_df.groupby('Year').mean().tail(5)
        
        yearly_data = []
        for year, row in yearly_df.iterrows():
            yearly_data.append({
                'period': str(year),
                'actual': float(row['Actual']),
                'predicted': float(row['Predicted']),
                'accuracy': float(calculate_accuracy(row['Actual'], row['Predicted']))
            })
            
        # Calculate 12-month average performance (Month-wise)
        analysis_df['Month_Year'] = analysis_df.index.to_period('M')
        monthly_df = analysis_df.groupby('Month_Year').mean().tail(12)
        
        monthly_data = []
        for period, row in monthly_df.iterrows():
            monthly_data.append({
                'period': str(period),
                'actual': float(row['Actual']),
                'predicted': float(row['Predicted']),
                'accuracy': float(calculate_accuracy(row['Actual'], row['Predicted']))
            })
        
        # Calculate total average prediction accuracy
        actuals = analysis_df['Actual'].values
        predicteds = analysis_df['Predicted'].values
        valid_idx = actuals != 0
        if np.any(valid_idx):
            accuracies = 100 - (np.abs(actuals[valid_idx] - predicteds[valid_idx]) / actuals[valid_idx]) * 100
            accuracies = np.maximum(0, accuracies)
            total_accuracy = float(np.mean(accuracies))
        else:
            total_accuracy = 0.0
            
        return jsonify({
            'success': True,
            'ticker': ticker,
            'dates': dates,
            'historical_prices': historical_prices,
            'test_dates': test_dates,
            'predicted_prices': predicted_prices,
            'actual_test_prices': actual_test_prices,
            'rmse': float(rmse),
            'total_accuracy': total_accuracy,
            'yearly_data': yearly_data,
            'monthly_data': monthly_data
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Pre-load model on startup
    get_model()
    app.run(debug=True, port=5000)