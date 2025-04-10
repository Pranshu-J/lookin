'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import localFont from "next/font/local"

// --- Components ---

const sourceSans = localFont({
  src: "./SourceSansPro/SourceSansPro-Regular.ttf",
  display: 'swap',
});

// Simple SVG Magnifying Glass Icon component
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

// Global CSS for animations or resets
const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    body { margin: 0; font-family: sans-serif; background-color: #f0f2f5; }
    /* Ensure font is applied if needed globally or via className */
    body { font-family: ${sourceSans.style.fontFamily}; }
  `}</style>
);

// Encryption Animation Component
const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-=_+[]{}|;:,.<>?/~`';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const EncryptionAnimation = ({ isRunning, targetLength = 25 }) => { // Default length
    const [displayText, setDisplayText] = useState('');
    const intervalRef = useRef(null);
    const animationFrameRef = useRef(null); // Use requestAnimationFrame

    useEffect(() => {
      if (isRunning) {
        const updateText = () => {
          setDisplayText(generateRandomString(targetLength));
          animationFrameRef.current = requestAnimationFrame(updateText); // Loop
        };
        // Start the animation loop slightly delayed to ensure rendering
        const timeoutId = setTimeout(() => {
            animationFrameRef.current = requestAnimationFrame(updateText);
        }, 60); // Adjust delay if needed


        // Fallback interval clear just in case (though rAF is preferred)
        if (intervalRef.current) clearInterval(intervalRef.current);
         intervalRef.current = setInterval(() => { /* Keep it around for cleanup*/}, 1000); // Dummy interval for cleanup logic below


      } else {
         // Clear animation frame and interval
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
         // Optionally clear text when stopped
         setDisplayText('');
      }

      // Cleanup function
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
           animationFrameRef.current = null;
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [isRunning, targetLength]);

    const animationStyle = {
      fontFamily: 'monospace',
      fontSize: '1.2rem',
      color: 'black',
      wordWrap: 'break-word',
      textAlign: 'center',
      minHeight: '1.5em', // Ensure space is reserved
      marginTop: '10px',
      padding: '0 10px',
    };

    // Render display text directly - useEffect controls the content
    return <p style={animationStyle}>{displayText}</p>;
};


// --- Styles --- (Keep your existing styles object)
const styles = {
    pageContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%', padding: '20px', boxSizing: 'border-box' },
    formContainer: { width: '100%', maxWidth: '600px' },
    inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center', backgroundColor: 'white', borderRadius: '9999px', border: '1px solid #ccc', padding: '5px 5px 5px 25px', boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)' },
    inputField: { flexGrow: 1, border: 'none', outline: 'none', fontSize: '1rem', backgroundColor: 'transparent', paddingRight: '60px', height: '45px', boxSizing: 'border-box', color:"black" },
    searchButton: { position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', width: '45px', height: '45px', borderRadius: '50%', border: 'none', backgroundColor: '#007bff', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', transition: 'background-color 0.2s ease' },
    searchButtonDisabled: { backgroundColor: '#cccccc', cursor: 'not-allowed' },
    spinner: { border: '3px solid rgba(255, 255, 255, 0.3)', borderTop: '3px solid #ffffff', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' },
    // Updated: Result container always shows when displayUrl is set
    processingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '600px', // Match form width
      marginTop: '20px', // Add some space from top/form
    },
    resultImage: { width: '200px', height: '200px', borderRadius: '50%', objectFit: 'cover', marginBottom: '25px', border: '3px solid #eee', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', background: '#f0f2f5' /* Placeholder bg */ },
    resultText: { fontSize: '1.2rem', color: 'black', maxWidth: '600px', wordWrap: 'break-word', marginTop: '10px', minHeight: '1.5em'}, // Added minHeight, changed color
    errorText: { color: 'red', textAlign: 'center', marginTop: '10px', maxWidth: '600px', wordWrap: 'break-word', minHeight: '1.5em' }, // Added minHeight
    loadingFallback: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '1.5rem', color: 'black' } // Changed color
};

// --- SearchParamHandler ---
// No changes needed here, the logic seems sound.
function SearchParamHandler({ onSubmitUrl, initialTask }) {
  const searchParams = useSearchParams();
  const processedQueryUrlRef = useRef(null);

  useEffect(() => {
    const queryUrl = searchParams.get('q');

    // Ensure initialTask check is robust - trigger only if URL exists, hasn't been processed by *this effect instance*, AND no task active *initially*
    if (queryUrl && queryUrl !== processedQueryUrlRef.current && !initialTask) {
      console.log(`SearchParamHandler: Found query URL '${queryUrl}', haven't processed it yet and no initial task. Triggering submission.`);
      processedQueryUrlRef.current = queryUrl; // Mark as processed *immediately*
      onSubmitUrl(queryUrl); // Call the memoized submission function from parent
    } else if (queryUrl && queryUrl === processedQueryUrlRef.current) {
        // console.log(`SearchParamHandler: Query URL ${queryUrl} already processed by this instance.`);
    } else if (initialTask) {
        // console.log(`SearchParamHandler: Initial task ID ${initialTask.id} exists, skipping query URL processing.`);
    }
     // console.log(`SearchParamHandler Effect Ran. QueryURL: ${queryUrl}, ProcessedRef: ${processedQueryUrlRef.current}, InitialTask: ${initialTask?.id}`);

  }, [searchParams, onSubmitUrl, initialTask]);

  return null;
}

// --- LoadingFallback ---
function LoadingFallback() {
    return <div style={styles.loadingFallback}>Loading...</div>;
}

// --- Main Page Component ---
export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false); // Tracks the *entire* processing duration now
  const [error, setError] = useState(null);
  const [submittedTask, setSubmittedTask] = useState(null); // Stores the {id, url, ...} of the submitted task
  const [resultValue, setResultValue] = useState(null); // Stores the final result string
  const [displayUrl, setDisplayUrl] = useState(null); // Stores the URL being processed/displayed

  const subscriptionRef = useRef(null);

  // --- Cleanup Subscription ---
  const cleanupSubscription = useCallback(async (taskId) => {
    if (subscriptionRef.current) {
      console.log(`Cleaning up subscription for task ID: ${taskId || 'unknown'}`);
      try {
        const status = await supabase.removeChannel(subscriptionRef.current);
        console.log(`Subscription removal status for ${taskId}:`, status);
      } catch (err) {
        console.error(`Error removing subscription channel for ${taskId}:`, err);
      } finally {
        subscriptionRef.current = null;
      }
    }
  }, [supabase]); // Include supabase in dependencies

  // --- Memoized Submission Logic ---
  const submitUrlForProcessing = useCallback(async (urlToProcess) => {
    // Basic validation
    if (!urlToProcess || !urlToProcess.trim()) {
        setError("URL cannot be empty.");
        setDisplayUrl(null);
        setLoading(false); // Ensure loading stops
        return;
    }
    // More specific validation
    try {
      const parsedUrl = new URL(urlToProcess);
      if (!parsedUrl.hostname.endsWith('media.licdn.com')) {
         throw new Error("Invalid Hostname");
      }
    } catch(e) {
       setError("Please enter a valid LinkedIn media URL (e.g., https://media.licdn.com/...).");
       setDisplayUrl(null);
       setLoading(false); // Ensure loading stops
       return;
    }

    console.log(`Submitting URL: ${urlToProcess}`);
    // Reset state for new submission
    setLoading(true); // Start loading indicator immediately
    setError(null);
    setResultValue(null);
    setSubmittedTask(null); // Clear previous task details
    setDisplayUrl(urlToProcess); // Set URL for display *now*
    await cleanupSubscription('previous'); // Clean up any old subscription before starting

    try {
        const { data, error: insertError } = await supabase
            .from('ImageURLs')
            .insert([{ url: urlToProcess, job_status: 'pending' }])
            .select() // Select the inserted row
            .single(); // Expect a single row back

        if (insertError) throw insertError;

        if (data && data.id) {
            console.log('Task submission successful, received task data:', data);
            setSubmittedTask(data); // Store the submitted task details (triggers listener useEffect)
            // setLoading remains true until result/error
        } else {
            // This case should ideally not happen with .select().single() if insert is successful
            console.error("No data or ID returned after insert, though insert didn't error.", data);
            throw new Error("Task submission failed: No task details received.");
        }
    } catch (err) {
        console.error("Error during task submission or insert:", err);
        setError(err.message || "Failed to submit the task. Please try again.");
        setSubmittedTask(null);
        setDisplayUrl(null); // Optionally hide image on submission error, or keep it: setDisplayUrl(urlToProcess)
        setLoading(false); // Stop loading indicator on submission error
    }
  }, [supabase, cleanupSubscription]); // Add cleanupSubscription dependency


  // --- Form Submit Handler ---
  const handleSubmit = (event) => {
    event.preventDefault();
    // No await needed here, let submitUrlForProcessing run async
    submitUrlForProcessing(inputValue);
    // Clear input after initiating submission
    setInputValue('');
  };

  // --- UseEffect for Supabase Realtime Listener ---
  useEffect(() => {
    // Only proceed if we have a task ID and no active subscription
    if (!submittedTask?.id || subscriptionRef.current) {
      // If task becomes null, ensure cleanup happens (added safety)
       if (!submittedTask?.id && subscriptionRef.current) {
           console.log("Task cleared, ensuring subscription cleanup.")
           cleanupSubscription(subscriptionRef.current.topic?.split('-').pop());
       }
      // console.log(`Listener Effect: Skipping setup. TaskID: ${submittedTask?.id}, SubRef: ${!!subscriptionRef.current}`);
      return;
    }

    const currentTaskId = submittedTask.id;
    console.log(`Setting up Supabase listener for task ID: ${currentTaskId}`);

    const handleBroadcast = (payload) => {
      // Ensure the update is for the task we are currently tracking
      if (payload.new && payload.new.id === currentTaskId) {
        console.log(`Realtime update received for task ${currentTaskId}:`, payload.new);
        const { result, job_status, error_message } = payload.new;

        if (result) {
          console.log(`Result received for task ${currentTaskId}:`, result);
          setResultValue(result);
          setError(null);
          setLoading(false); // Stop loading
          cleanupSubscription(currentTaskId); // Unsubscribe on final result
        } else if (job_status === 'failed') {
          console.error(`Task ${currentTaskId} failed: ${error_message || 'Unknown error'}`);
          setError(`Processing failed: ${error_message || 'Unknown error'}`);
          setResultValue(null);
          setLoading(false); // Stop loading
          cleanupSubscription(currentTaskId); // Unsubscribe on failure
        } else {
          // Still pending or other status - keep loading
          console.log(`Task ${currentTaskId} status: ${job_status}. Waiting...`);
          setLoading(true); // Ensure loading remains true
        }
      } else {
         // console.log(`Realtime update received, but not for current task ${currentTaskId}. Payload ID: ${payload.new?.id}`);
      }
    };

    const channel = supabase
      .channel(`imageurl-result-${currentTaskId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ImageURLs', filter: `id=eq.${currentTaskId}` },
        handleBroadcast
      )
      .subscribe((status, err) => {
         if (status === 'SUBSCRIBED') {
           console.log(`Successfully subscribed for task ${currentTaskId}!`);
           setLoading(true); // Explicitly ensure loading is true upon successful subscription
         } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED' || err) {
           console.error(`Subscription error/closed for task ${currentTaskId}. Status: ${status}`, err || '');
           // Avoid setting generic connection error if we already have a result/specific error
           if (!resultValue && !error) {
               setError(`Connection error listening for results. Please try again.`);
           }
           setLoading(false); // Stop loading on subscription issues
           // Don't cleanup here, allow potential reconnect or handle specific errors
           // cleanupSubscription(currentTaskId); might be too aggressive
         } else {
           console.log(`Subscription status for task ${currentTaskId}: ${status}`);
         }
      });

    subscriptionRef.current = channel;
    console.log(`Subscription ref set for channel: ${channel.topic}`);

    // Cleanup function for this effect instance
    return () => {
        console.log(`Running cleanup for listener effect (Task ID was ${currentTaskId})`);
        cleanupSubscription(currentTaskId);
    };
    // Dependencies: Only re-run if the submittedTask object itself changes (specifically its id) or cleanup function changes
  }, [submittedTask, supabase, cleanupSubscription, error, resultValue]);


  // --- Determine if animation should run ---
  // Animation runs if loading is true, we have a URL displayed, AND no final result/error has arrived.
  const showAnimation = loading && displayUrl && !resultValue && !error;

  // --- Determine if we should show the processing/result area ---
  const showProcessingArea = !!displayUrl; // Show as soon as a URL is submitted and validated

  return (
    <Suspense fallback={<LoadingFallback />}>
       {/* SearchParamHandler is placed outside the main conditional rendering
           but needs access to submitUrlForProcessing and the *current* submittedTask state */}
      <SearchParamHandler
        onSubmitUrl={submitUrlForProcessing}
        initialTask={submittedTask} // Pass current task state
      />

      <div style={styles.pageContainer} className={sourceSans.className}>
        <GlobalStyles />

        {/* Always render the form container, but maybe hide/show form itself */}
        <div style={styles.formContainer}>
          {/* Input Form View - Conditionally hide if processing starts? Or just disable? */}
          {/* Let's show it always but disable during loading */}
           <form onSubmit={handleSubmit} style={{ marginBottom: showProcessingArea ? '20px' : '0' }}>
            <div style={styles.inputWrapper}>
              <input
                type="url"
                placeholder="Paste LinkedIn image URL (media.licdn.com)..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                // Disable input field slightly differently: disable if a URL is currently being processed.
                disabled={loading && !!displayUrl}
                style={styles.inputField}
                required
              />
              <button
                type="submit"
                // Disable button if loading OR if input is empty OR invalid pattern (basic check)
                disabled={loading || !inputValue.trim() || !inputValue.includes('media.licdn.com')}
                style={(loading || !inputValue.trim() || !inputValue.includes('media.licdn.com')) ? {...styles.searchButton, ...styles.searchButtonDisabled} : styles.searchButton}
                aria-label="Submit URL"
              >
                {/* Show spinner ONLY during active loading phase */}
                {loading ? <div style={styles.spinner}></div> : <SearchIcon />}
              </button>
            </div>
             {/* Display validation errors related to the *input form* here */}
             {error && !displayUrl && <p style={styles.errorText}>{error}</p>}
          </form>

           {/* --- Processing/Result View --- */}
           {/* This section is rendered based on displayUrl state */}
           {showProcessingArea && (
             <div style={styles.processingContainer}>
                <img
                  key={displayUrl} // Re-render if displayUrl changes
                  src={`/api/image-proxy?url=${encodeURIComponent(displayUrl)}`}
                  alt="Submitted profile picture"
                  style={styles.resultImage}
                  onError={(e) => {
                      console.error("Error loading image via proxy:", displayUrl);
                      e.target.style.display = 'none'; // Hide broken image
                      // Set an error state, but don't overwrite processing errors unless it's the only error
                      setError(prev => prev ? `${prev}\n(Failed to load image preview)` : "Failed to load image preview.");
                      // Don't stop loading here, the backend might still be processing
                  }}
                  onLoad={() => {
                    // Optional: Clear image-specific error if it loads successfully later
                    // setError(prev => prev?.includes("Failed to load image") ? null : prev);
                  }}
                />

                {/* Display Area: Animation OR Result OR Error */}
                <div style={{ minHeight: '3em' /* Reserve space */ }}>
                  {showAnimation ? (
                     <EncryptionAnimation isRunning={true} />
                  ) : resultValue ? (
                     <p style={styles.resultText}>{resultValue}</p>
                  ) : error ? (
                     // Show processing/connection errors here
                     <p style={styles.errorText}>{error}</p>
                  ) : null /* Fallback if needed */ }
                </div>


                {/* Button to start over - Show when processing is finished (result or error) */}
                { !loading && (resultValue || error) &&
                  <button onClick={() => {
                      setDisplayUrl(null);
                      setSubmittedTask(null);
                      setResultValue(null);
                      setError(null);
                      setInputValue(''); // Clear input for next use
                      setLoading(false); // Ensure loading is false
                      cleanupSubscription('manual reset'); // Clean up just in case
                  }} style={{ marginTop: '20px', padding: '10px 15px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    Search Another URL
                  </button>
                }
             </div>
           )}
        </div> {/* End formContainer */}
      </div>
    </Suspense>
  );
}