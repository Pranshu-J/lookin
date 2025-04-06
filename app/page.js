// app/page.js (or pages/index.js)
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; // For SearchParamHandler
import { supabase } from '../lib/supabaseClient'; // Adjust path if needed

// --- Components ---

// Simple SVG Magnifying Glass Icon component
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

// Global CSS for animations or resets
const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    /* Add any other global styles here */
    body {
      margin: 0; /* Example reset */
      font-family: sans-serif; /* Example default font */
      background-color: #f0f2f5; /* Example background */
    }
  `}</style>
);

// --- Styles ---
const styles = {
    pageContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      width: '100%',
      padding: '20px',
      boxSizing: 'border-box',
    },
    formContainer: {
      width: '100%',
      maxWidth: '600px',
    },
    inputWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: 'white',
      borderRadius: '9999px',
      border: '1px solid #ccc',
      padding: '5px 5px 5px 25px',
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
    },
    inputField: {
      flexGrow: 1,
      border: 'none',
      outline: 'none',
      fontSize: '1rem',
      backgroundColor: 'transparent',
      paddingRight: '60px', // Space for the button
      height: '45px',
      boxSizing: 'border-box',
      color:"black", // Ensure text is visible
    },
    searchButton: {
      position: 'absolute',
      right: '5px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '45px',
      height: '45px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: '#007bff',
      color: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    },
    searchButtonDisabled: {
      backgroundColor: '#cccccc',
      cursor: 'not-allowed',
    },
    spinner: {
      border: '3px solid rgba(255, 255, 255, 0.3)',
      borderTop: '3px solid #ffffff',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      animation: 'spin 1s linear infinite',
    },
    resultContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    },
    resultImage: {
      width: '250px',
      height: '250px',
      borderRadius: '50%',
      objectFit: 'cover',
      marginBottom: '25px',
      border: '3px solid #eee', // Changed border slightly
      boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
      background: '#eee' // Fallback background
    },
    resultText: {
      fontSize: '1.2rem',
      color: '#333',
      maxWidth: '600px',
      wordWrap: 'break-word', // Ensure long text wraps
      marginTop: '10px',
    },
    errorText: {
      color: 'red',
      textAlign: 'center',
      marginTop: '10px',
    },
    loadingFallback: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontSize: '1.5rem',
      color: '#555',
    }
};

// --- Component dedicated to handling search params ---
// This component uses useSearchParams and MUST be rendered within a <Suspense> boundary
function SearchParamHandler({ onSubmitUrl, initialLoading, initialTask }) {
  // This hook triggers the Suspense boundary if used during SSR/prerendering
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryUrl = searchParams.get('q');

    // Check if a query URL exists AND if we haven't already started processing
    // from a previous render or manual submission.
    if (queryUrl && !initialLoading && !initialTask) {
      console.log(`SearchParamHandler: Found query URL, triggering submission: ${queryUrl}`);
      onSubmitUrl(queryUrl); // Call the memoized submission function from parent
    }
    // Dependencies: Run when search params change, or the parent component's state indicates readiness.
  }, [searchParams, onSubmitUrl, initialLoading, initialTask]);

  // This component doesn't render anything itself
  return null;
}

// --- Loading Fallback Component ---
// This is shown while the component using useSearchParams (SearchParamHandler) is loading
function LoadingFallback() {
    return <div style={styles.loadingFallback}>Loading...</div>;
}

// --- Main Page Component ---
export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submittedTask, setSubmittedTask] = useState(null); // Stores the {id, url, ...} of the submitted task
  const [resultValue, setResultValue] = useState(null); // Stores the final result string

  const subscriptionRef = useRef(null); // To manage the Supabase subscription

  // --- Memoized Submission Logic ---
  // useCallback prevents this function from being recreated on every render,
  // making it safe to use in useEffect dependency arrays.
  const submitUrlForProcessing = useCallback(async (urlToProcess) => {
    if (!urlToProcess || !urlToProcess.trim()) {
      console.warn("URL cannot be empty.");
      setError("URL cannot be empty.");
      return;
    }
    // Basic validation - adjust as needed
    if (!urlToProcess.includes("media.licdn.com")) {
      console.warn("URL must be a LinkedIn media URL");
      setError("Please enter a valid LinkedIn media URL (media.licdn.com).");
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors
    setResultValue(null); // Clear previous results
    setSubmittedTask(null); // Reset submitted task state
    console.log(`Attempting to submit URL: ${urlToProcess}`);

    try {
      const { data, error: insertError } = await supabase
        .from('ImageURLs') // Your table name
        .insert([{ url: urlToProcess, job_status: 'pending' }]) // Initial state
        .select() // Select the newly inserted row
        .single(); // Expect only one row back

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        throw insertError; // Rethrow to be caught below
      }

      if (data) {
        console.log('Task submitted successfully via function:', data);
        setSubmittedTask(data); // Set the submitted task state, which triggers the listener useEffect
      } else {
        // This case should be unlikely if insertError is null, but good practice
        throw new Error("No data returned after insert, although no error was reported.");
      }
    } catch (err) {
      console.error("Error submitting task:", err);
      setError(err.message || "Failed to submit the task. Please try again.");
      setSubmittedTask(null); // Ensure task state is cleared on error
    } finally {
      // This runs whether the try block succeeded or failed
      setLoading(false);
    }
  }, [supabase]); // Dependency: Only recreate if supabase client instance changes (unlikely)

  // --- Form Submit Handler ---
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default form submission page reload
    // Call the memoized function with the current input value
    await submitUrlForProcessing(inputValue);
    // Clear input only if submission was initiated without immediate client-side error
    // Note: submitUrlForProcessing sets error state, so we check it AFTER calling
    if (!error) { // A basic check, might need refinement based on desired UX
       setInputValue('');
    }
  };

  // --- UseEffect for Supabase Realtime Listener ---
  useEffect(() => {
    // If there's no submitted task ID, don't set up a listener
    if (!submittedTask?.id) {
      // Cleanup potentially lingering subscription if task state becomes invalid
      if (subscriptionRef.current) {
        console.log(`Cleaning up subscription because submittedTask is null or has no ID.`);
        supabase.removeChannel(subscriptionRef.current)
          .catch(err => console.error("Error removing channel during cleanup:", err));
        subscriptionRef.current = null;
      }
      return; // Exit effect
    }

    // If a subscription already exists (e.g., from a rapid resubmit?), remove it first
    if (subscriptionRef.current) {
        console.log(`Removing previous channel before creating new one for task ${submittedTask.id}`);
        supabase.removeChannel(subscriptionRef.current)
          .catch(err => console.error("Error removing previous channel:", err));
        subscriptionRef.current = null;
    }


    console.log(`Setting up Supabase listener for task ID: ${submittedTask.id}`);

    // Function to handle incoming messages
    const handleBroadcast = (payload) => {
      console.log('Realtime update received:', payload);
      // Check if the update is for the task we are interested in
      if (payload.new && payload.new.id === submittedTask.id) {
        // Check if the result field is now populated
        if (payload.new.result) {
          console.log(`Result received for task ${submittedTask.id}:`, payload.new.result);
          setResultValue(payload.new.result); // Update state with the result
          setError(null); // Clear any previous errors if we got a result

          // Unsubscribe once we get the result to save resources
          if (subscriptionRef.current) {
            supabase.removeChannel(subscriptionRef.current)
              .then(() => console.log(`Unsubscribed successfully after receiving result for task ${submittedTask.id}.`))
              .catch(err => console.error("Error unsubscribing channel:", err));
            subscriptionRef.current = null;
          }
        } else if (payload.new.job_status === 'failed') {
            // Handle potential failure status from backend
            console.error(`Task ${submittedTask.id} failed. Reason: ${payload.new.error_message || 'Unknown error'}`);
            setError(`Processing failed: ${payload.new.error_message || 'An unknown error occurred during processing.'}`);
            setResultValue(null); // Ensure no stale result is shown
            // Optionally unsubscribe on failure too
             if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current)
                .catch(err => console.error("Error unsubscribing channel on failure:", err));
                subscriptionRef.current = null;
             }
        } else {
          // Log status updates if needed, but don't change primary state yet
           console.log(`Update for task ${submittedTask.id}. Status: ${payload.new.job_status}. Waiting for result.`);
        }
      } else {
        // Log if we receive a message not matching the current task ID (shouldn't happen with filter)
        console.log(`Ignoring broadcast not matching task ID ${submittedTask?.id}. Received for ID ${payload.new?.id}.`);
      }
    };

    // Create the subscription channel
    const channel = supabase
      .channel(`imageurl-result-${submittedTask.id}`) // Unique channel name per task
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Listen for updates
          schema: 'public',
          table: 'ImageURLs', // Your table name
          filter: `id=eq.${submittedTask.id}` // *Crucial*: Only listen for changes to THIS task's row
        },
        handleBroadcast // Call our handler function when a matching update occurs
      )
      .subscribe((status, err) => {
        // Optional: Log subscription status changes
         if (status === 'SUBSCRIBED') {
           console.log(`Successfully subscribed to channel for task ${submittedTask.id}!`);
         } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
           console.error(`Subscription error for task ${submittedTask.id}:`, status, err);
           setError(`Connection error: Could not listen for results. Status: ${status}`);
           // Maybe attempt resubscribe logic here, or just inform user
         } else {
           console.log(`Subscription status change for task ${submittedTask.id}: ${status}`);
         }
      });

    // Store the channel in the ref so we can unsubscribe later
    subscriptionRef.current = channel;

    // --- Cleanup Function ---
    // This runs when the component unmounts OR when submittedTask changes (before the effect runs again)
    return () => {
      if (subscriptionRef.current) {
        console.log(`Cleaning up subscription effect for task ID: ${submittedTask?.id}`);
        supabase.removeChannel(subscriptionRef.current)
         .catch(err => console.error("Error cleaning up channel:", err));
        subscriptionRef.current = null; // Clear the ref
      }
    };
  }, [submittedTask, supabase]); // Dependencies: Re-run effect if submittedTask or supabase changes

  // --- Determine View ---
  // Show result view ONLY if we have a submitted task AND its corresponding resultValue is set
  const showResultView = submittedTask?.url && resultValue !== null;

  return (
    // Wrap the part of the tree that depends on client-side info (useSearchParams) in Suspense
    <Suspense fallback={<LoadingFallback />}>
      {/* Render the component that uses useSearchParams INSIDE Suspense */}
      <SearchParamHandler
        onSubmitUrl={submitUrlForProcessing}
        initialLoading={loading}
        initialTask={submittedTask}
      />

      {/* Main page structure */}
      <div style={styles.pageContainer}>
        <GlobalStyles />

        {showResultView ? (
          // --- Result View ---
          <div style={styles.resultContainer}>
            <img
              // Use task ID in key for potential re-renders if task changes
              key={submittedTask.id}
              // Use the image proxy API route you might have created
              // Ensure the URL is properly encoded
              src={`/api/image-proxy?url=${encodeURIComponent(submittedTask.url)}`}
              alt="Submitted content visualization"
              style={styles.resultImage}
              // Basic image error handling
              onError={(e) => {
                  console.error("Error loading image:", submittedTask.url);
                  e.target.style.display = 'none'; // Hide broken image icon
                  // Optionally show a placeholder or error message here
              }}
            />
            <p style={styles.resultText}>{resultValue}</p>
            {/* Optional: Button to clear results and start over */}
            {/* <button onClick={() => {
                setSubmittedTask(null);
                setResultValue(null);
                setError(null);
                setInputValue(''); // Clear input too
            }} style={{ marginTop: '20px', padding: '10px 15px' }}>
              Start New Search
            </button> */}
          </div>
        ) : (
          // --- Input View ---
          <form onSubmit={handleSubmit} style={styles.formContainer}>
            <div style={styles.inputWrapper}>
              <input
                type="url" // Use 'url' type for better mobile keyboards & basic validation
                placeholder="Paste LinkedIn image URL (media.licdn.com)..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={loading} // Disable input while loading
                style={styles.inputField}
                required // Basic HTML5 validation for empty field on manual submit
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()} // Disable if loading or input is empty/whitespace
                style={loading || !inputValue.trim() ? {...styles.searchButton, ...styles.searchButtonDisabled} : styles.searchButton}
                aria-label="Submit URL for processing"
              >
                {/* Show spinner when loading, otherwise show search icon */}
                {loading ? <div style={styles.spinner}></div> : <SearchIcon />}
              </button>
            </div>
             {/* Display submission or connection errors */}
             {error && !loading && <p style={styles.errorText}>{error}</p>}
             {/* Optionally show a processing indicator even when not in result view */}
             {loading && !resultValue && <p style={{ textAlign: 'center', marginTop: '10px', color: '#555' }}>Processing...</p>}
          </form>
        )}
      </div>
    </Suspense>
  );
}